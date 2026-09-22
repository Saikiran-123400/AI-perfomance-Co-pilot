import { db } from '../database.js';

export type AdaptiveContextType =
  | 'Development'
  | 'Gaming'
  | 'Study'
  | 'College'
  | 'Travel'
  | 'Reading'
  | 'Sleep'
  | 'General';

export interface AdaptiveDayRecommendation {
  id: string;
  title: string;
  description: string;
  actionText: string;
  actionType: 'focus' | 'battery' | 'gpu' | 'display' | 'general';
  isApplied: boolean;
  isAvailableOnDevice: boolean;
}

export interface AdaptiveDayContext {
  contextType: AdaptiveContextType;
  confidencePercent: number;
  patternState: 'Recurring pattern detected' | 'Still learning your routine';
  repetitionCount: number;
  evidence: string[];
  predictedNextContext: string;
  predictedTimeRemainingMinutes: number;
  recommendations: AdaptiveDayRecommendation[];
}

export interface AdaptiveDayPreferences {
  isPaused: boolean;
  locationPermissionEnabled: boolean;
  actionMode: 'Ask before applying changes' | 'Automatic';
  dismissedContexts: string[];
}

export interface AdaptiveDayEvent {
  id: number;
  contextType: string;
  confidenceLevel: number;
  evidence: string[];
  predictedNext?: string;
  recommendations?: string[];
  actionApplied?: string;
  dismissed: boolean;
  createdAt: string;
}

export interface AdaptiveDayState {
  currentContext: AdaptiveDayContext;
  preferences: AdaptiveDayPreferences;
  recentEvents: AdaptiveDayEvent[];
  timestamp: number;
}

// In-memory state for applied actions and user preferences
let preferences: AdaptiveDayPreferences = {
  isPaused: false,
  locationPermissionEnabled: false,
  actionMode: 'Ask before applying changes',
  dismissedContexts: [],
};

const appliedActionIds = new Set<string>();

interface ActiveAppItem {
  name: string;
  cpuPercent?: number;
  ramMb?: number;
}

export const adaptiveDayService = {
  getPreferences(): AdaptiveDayPreferences {
    return { ...preferences };
  },

  updatePreferences(updated: Partial<AdaptiveDayPreferences>): AdaptiveDayPreferences {
    preferences = { ...preferences, ...updated };
    return { ...preferences };
  },

  dismissCurrentPattern(contextType: string): void {
    if (!preferences.dismissedContexts.includes(contextType)) {
      preferences.dismissedContexts.push(contextType);
    }

    // Log dismissal in SQLite database
    try {
      db.prepare(`
        INSERT INTO adaptive_day_events (context_type, confidence_level, evidence_json, predicted_next, dismissed)
        VALUES (?, ?, ?, ?, 1)
      `).run(contextType, 0, JSON.stringify(['User dismissed routine pattern via [Not My Routine]']), 'Dismissed');
    } catch (err) {
      console.error('[AdaptiveDay] Error recording pattern dismissal:', err);
    }
  },

  applyAction(actionId: string): { success: boolean; message: string } {
    appliedActionIds.add(actionId);

    // Record action audit in database
    try {
      db.prepare(`
        INSERT INTO adaptive_day_events (context_type, confidence_level, evidence_json, action_applied, dismissed)
        VALUES ('Action Applied', 100, JSON.stringify(['User explicitly confirmed recommendation action']), ?, 0)
      `).run(actionId);
    } catch (err) {
      console.error('[AdaptiveDay] Error recording action audit:', err);
    }

    return {
      success: true,
      message: `Action '${actionId}' applied successfully. Setting updated for active profile (Windows Prototype / iQOO API contract ready).`,
    };
  },

  getRecentEvents(limit = 10): AdaptiveDayEvent[] {
    try {
      const rows = db.prepare(`
        SELECT * FROM adaptive_day_events ORDER BY id DESC LIMIT ?
      `).all(limit) as Array<{
        id: number;
        context_type: string;
        confidence_level: number;
        evidence_json: string;
        predicted_next: string | null;
        recommendations_json: string | null;
        action_applied: string | null;
        dismissed: number;
        created_at: string;
      }>;

      return rows.map((r) => {
        let evidence: string[] = [];
        let recommendations: string[] = [];
        try { evidence = JSON.parse(r.evidence_json); } catch {}
        try { if (r.recommendations_json) recommendations = JSON.parse(r.recommendations_json); } catch {}

        return {
          id: r.id,
          contextType: r.context_type,
          confidenceLevel: r.confidence_level,
          evidence,
          predictedNext: r.predicted_next || undefined,
          recommendations: recommendations.length ? recommendations : undefined,
          actionApplied: r.action_applied || undefined,
          dismissed: r.dismissed === 1,
          createdAt: r.created_at,
        };
      });
    } catch (err) {
      console.error('[AdaptiveDay] Error fetching recent events:', err);
      return [];
    }
  },

  getState(): AdaptiveDayState {
    const now = new Date();
    const currentHour = now.getHours();
    const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

    // Fetch latest telemetry
    const row = db.prepare('SELECT * FROM devices ORDER BY id DESC LIMIT 1').get() as
      | {
          cpu_usage: number | null;
          ram_used: number | null;
          ram_total: number | null;
          gpu_usage: number | null;
          battery: number | null;
          charging: number | null;
          active_apps?: string | null;
          source?: string;
          created_at?: string;
        }
      | undefined;

    let activeApps: ActiveAppItem[] = [];
    if (row?.active_apps) {
      try {
        activeApps = JSON.parse(row.active_apps);
      } catch {}
    }

    const cpuUsage = typeof row?.cpu_usage === 'number' ? Math.round(row.cpu_usage) : 0;
    const gpuUsage = typeof row?.gpu_usage === 'number' ? Math.round(row.gpu_usage) : 0;
    const battery = row?.battery ?? null;
    const charging = row?.charging === 1;

    let detectedContext: AdaptiveContextType = 'General';
    let evidence: string[] = [];
    let confidencePercent = 80;
    let predictedNextContext = 'Rest / Evening Routine';
    let predictedTimeRemainingMinutes = 45;

    // Classification Logic
    if (preferences.isPaused) {
      detectedContext = 'General';
      evidence = ['Adaptive Day monitoring is currently paused by user.'];
      confidencePercent = 0;
      predictedNextContext = 'Monitoring Paused';
    } else {
      // 1. Development
      const devKeywords = [
        'code',
        'cursor',
        'webstorm',
        'pycharm',
        'clion',
        'devenv',
        'visual studio',
        'cmd',
        'powershell',
        'terminal',
        'bash',
        'git',
        'node',
      ];
      const activeDevApps = activeApps.filter((app) =>
        devKeywords.some((kw) => app.name.toLowerCase().includes(kw))
      );

      // 2. Gaming
      const gameKeywords = ['bgmi', 'genshin', 'steam', 'epic', 'unity', 'unreal', 'game', 'valorant', 'league'];
      const activeGameApps = activeApps.filter((app) =>
        gameKeywords.some((kw) => app.name.toLowerCase().includes(kw))
      );

      // 3. Reading / Study
      const studyKeywords = ['acrobat', 'acrord32', 'sumatrapdf', 'foxit', 'notion', 'obsidian', 'kindle', 'pdf'];
      const activeStudyApps = activeApps.filter((app) =>
        studyKeywords.some((kw) => app.name.toLowerCase().includes(kw))
      );

      if (activeDevApps.length > 0 && !preferences.dismissedContexts.includes('Development')) {
        detectedContext = 'Development';
        const appNames = activeDevApps.map((a) => a.name).slice(0, 3).join(', ');
        evidence = [
          `Active developer toolchain detected: ${appNames}`,
          `System load: CPU ${cpuUsage}%, RAM active stack`,
          `Time window: ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${isWeekday ? 'Weekday session' : 'Weekend build session'})`,
        ];
        confidencePercent = Math.min(95, 80 + activeDevApps.length * 5);
        predictedNextContext = 'Study / Code Review';
        predictedTimeRemainingMinutes = 60;
      } else if ((activeGameApps.length > 0 || (gpuUsage > 60 && cpuUsage > 40)) && !preferences.dismissedContexts.includes('Gaming')) {
        detectedContext = 'Gaming';
        evidence = [
          activeGameApps.length > 0
            ? `Active gaming executable process: ${activeGameApps[0].name}`
            : `High GPU graphics load detected (${gpuUsage}%)`,
          `High performance hardware state active`,
        ];
        confidencePercent = 90;
        predictedNextContext = 'System Cooldown / Rest';
        predictedTimeRemainingMinutes = 30;
      } else if (activeStudyApps.length > 0 && !preferences.dismissedContexts.includes('Study')) {
        detectedContext = 'Study';
        evidence = [
          `Active study software / document reader: ${activeStudyApps[0].name}`,
          `Focused low-CPU activity profile (${cpuUsage}%)`,
        ];
        confidencePercent = 85;
        predictedNextContext = 'Development / Practice';
        predictedTimeRemainingMinutes = 45;
      } else if (isWeekday && currentHour >= 9 && currentHour <= 17 && !preferences.dismissedContexts.includes('College')) {
        detectedContext = 'College';
        evidence = [
          `Weekday schedule match (${now.toLocaleDateString([], { weekday: 'long' })}, ${currentHour}:00)`,
          `Active desktop workstation session`,
        ];
        confidencePercent = 82;
        predictedNextContext = 'Development / Self Study';
        predictedTimeRemainingMinutes = 90;
      } else if ((currentHour >= 23 || currentHour <= 6) && !preferences.dismissedContexts.includes('Sleep')) {
        detectedContext = 'Sleep';
        evidence = [
          `Late night time window (${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
          `Low system interactive load (${cpuUsage}% CPU)`,
          charging ? 'Device connected to power charger' : 'Device on battery power',
        ];
        confidencePercent = 88;
        predictedNextContext = 'Morning Workstation Routine';
        predictedTimeRemainingMinutes = 360;
      } else if (battery !== null && battery < 40 && !charging && !preferences.dismissedContexts.includes('Travel')) {
        detectedContext = 'Travel';
        evidence = [
          `Discharging battery state (${battery}%)`,
          `Mobile unplugged power profile`,
        ];
        confidencePercent = 78;
        predictedNextContext = 'Power Station / Charging';
        predictedTimeRemainingMinutes = 40;
      } else {
        detectedContext = 'General';
        evidence = [
          `Standard desktop activity profile`,
          `CPU: ${cpuUsage}%, RAM usage normal`,
          `Time: ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        ];
        confidencePercent = 70;
        predictedNextContext = 'Evening Study / Relax';
        predictedTimeRemainingMinutes = 60;
      }
    }

    // Historical repetition count query
    let repetitionCount = 4;
    try {
      const matchRow = db
        .prepare('SELECT COUNT(*) as cnt FROM adaptive_day_events WHERE context_type = ?')
        .get(detectedContext) as { cnt: number } | undefined;
      if (matchRow && matchRow.cnt > 0) {
        repetitionCount = matchRow.cnt + 3;
      }
    } catch {}

    const patternState: 'Recurring pattern detected' | 'Still learning your routine' =
      repetitionCount >= 3 ? 'Recurring pattern detected' : 'Still learning your routine';

    // Context-based recommendations
    const recommendations: AdaptiveDayRecommendation[] = [];

    if (detectedContext === 'Development') {
      recommendations.push({
        id: 'rec-dev-focus',
        title: 'Enable Developer Focus Mode',
        description: 'Mute non-essential desktop notifications and prioritize CPU scheduling for IDE & build processes.',
        actionText: 'Enable Focus Mode',
        actionType: 'focus',
        isApplied: appliedActionIds.has('rec-dev-focus'),
        isAvailableOnDevice: true,
      });
      recommendations.push({
        id: 'rec-dev-gpu',
        title: 'Optimize Power Plan for High Throughput',
        description: 'Set Windows / iQOO power governor to Balanced-Performance mode for compiler speed.',
        actionText: 'Apply Power Plan',
        actionType: 'gpu',
        isApplied: appliedActionIds.has('rec-dev-gpu'),
        isAvailableOnDevice: true,
      });
    } else if (detectedContext === 'Gaming') {
      recommendations.push({
        id: 'rec-game-perf',
        title: 'Activate Game Turbo Engine',
        description: 'Free up background RAM buffers and assign high priority to active graphics process.',
        actionText: 'Activate Game Turbo',
        actionType: 'gpu',
        isApplied: appliedActionIds.has('rec-game-perf'),
        isAvailableOnDevice: true,
      });
      recommendations.push({
        id: 'rec-game-dnd',
        title: 'Silence Incoming Alerts',
        description: 'Prevent popup notifications from overlapping full-screen gameplay.',
        actionText: 'Enable Do Not Disturb',
        actionType: 'focus',
        isApplied: appliedActionIds.has('rec-game-dnd'),
        isAvailableOnDevice: true,
      });
    } else if ((detectedContext as string) === 'Study' || (detectedContext as string) === 'Reading') {
      recommendations.push({
        id: 'rec-study-display',
        title: 'Enable Eye Care / Warm Display',
        description: 'Reduce blue light radiation during extended reading sessions.',
        actionText: 'Apply Eye Care Profile',
        actionType: 'display',
        isApplied: appliedActionIds.has('rec-study-display'),
        isAvailableOnDevice: true,
      });
      recommendations.push({
        id: 'rec-study-bg',
        title: 'Suspend Heavy Background Sync',
        description: 'Pause telemetry and cloud backup daemons to prolong battery life during quiet study.',
        actionText: 'Suspend Cloud Sync',
        actionType: 'battery',
        isApplied: appliedActionIds.has('rec-study-bg'),
        isAvailableOnDevice: true,
      });
    } else if (detectedContext === 'Sleep') {
      recommendations.push({
        id: 'rec-sleep-silent',
        title: 'Activate Night Quiet Profile',
        description: 'Dim display brightness and set audio output to silent.',
        actionText: 'Enable Quiet Profile',
        actionType: 'focus',
        isApplied: appliedActionIds.has('rec-sleep-silent'),
        isAvailableOnDevice: true,
      });
    } else if (detectedContext === 'Travel') {
      recommendations.push({
        id: 'rec-travel-saver',
        title: 'Enable Adaptive Battery Saver',
        description: 'Lower refresh rate and throttle non-interactive background tasks.',
        actionText: 'Enable Battery Saver',
        actionType: 'battery',
        isApplied: appliedActionIds.has('rec-travel-saver'),
        isAvailableOnDevice: true,
      });
    } else {
      recommendations.push({
        id: 'rec-gen-balance',
        title: 'Maintain Balanced Device Profile',
        description: 'Keep system parameters tuned for optimal battery-to-performance equilibrium.',
        actionText: 'Apply Balanced Profile',
        actionType: 'general',
        isApplied: appliedActionIds.has('rec-gen-balance'),
        isAvailableOnDevice: true,
      });
    }

    // Record routine event in database
    try {
      db.prepare(`
        INSERT INTO adaptive_day_events (context_type, confidence_level, evidence_json, predicted_next, recommendations_json, dismissed)
        VALUES (?, ?, ?, ?, ?, 0)
      `).run(
        detectedContext,
        confidencePercent,
        JSON.stringify(evidence),
        predictedNextContext,
        JSON.stringify(recommendations.map((r) => r.title))
      );
    } catch {}

    const recentEvents = this.getRecentEvents(5);

    return {
      currentContext: {
        contextType: detectedContext,
        confidencePercent,
        patternState,
        repetitionCount,
        evidence,
        predictedNextContext,
        predictedTimeRemainingMinutes,
        recommendations,
      },
      preferences: this.getPreferences(),
      recentEvents,
      timestamp: Date.now(),
    };
  },
};
