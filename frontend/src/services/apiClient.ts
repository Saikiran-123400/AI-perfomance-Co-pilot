import type { AppProfile, AppImpactAnalysis, SimulationComparison, TelemetrySample, PlayStoreApp, AppSessionAnalysis, InstalledAppItem, CopilotResponse, StorageOverview, DeclutterSummary, DuplicateGroup, RedundantItem, DevProjectCleanup, FileItemInfo, SmartOrganizationPreview, SensitiveFileItem, StorageGrowthData, AdaptiveDayState } from '../types';
import { SAMPLE_APPS } from './appImpactService';

const API_BASE_URL = 'http://localhost:4000/api';

export const apiClient = {
  /** Fetch latest telemetry from SQLite backend */
  async getLatestTelemetry(): Promise<TelemetrySample | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/telemetry/latest?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!res.ok) return null;
      const data = await res.json();
      const parsedTime = data.timestamp || new Date(data.createdAt || Date.now()).getTime();

      const ramTot = typeof data.ramTotal === 'number' ? data.ramTotal : null;
      const ramU = typeof data.ramUsed === 'number' ? data.ramUsed : null;
      const calculatedRamUsage = (ramTot && ramU) ? Math.round((ramU / ramTot) * 100) : (typeof data.ramUsage === 'number' ? data.ramUsage : 0);

      const storageTot = typeof data.storageTotal === 'number' ? data.storageTotal : null;
      const storageAvail = typeof data.storageAvailable === 'number' ? data.storageAvailable : null;
      const calculatedStorageUsage = (storageTot && storageAvail) ? Math.round(((storageTot - storageAvail) / storageTot) * 100) : (typeof data.storageUsage === 'number' ? data.storageUsage : 0);

      const parsedActiveApps = Array.isArray(data.activeApplications)
        ? data.activeApplications
        : (Array.isArray(data.activeApps) ? data.activeApps : null);

      const parsedInstalledApps = Array.isArray(data.installedApplications)
        ? data.installedApplications
        : (Array.isArray(data.installedApps) ? data.installedApps : null);

      return {
        id: data.id,
        timestamp: parsedTime,
        cpuUsage: typeof data.cpuUsage === 'number' ? data.cpuUsage : 0,
        ramUsage: calculatedRamUsage,
        ramTotal: ramTot,
        ramUsed: ramU,
        ramAvailable: typeof data.ramAvailable === 'number' ? data.ramAvailable : null,
        storageUsage: calculatedStorageUsage,
        storageTotal: storageTot,
        storageUsed: typeof data.storageUsed === 'number' ? data.storageUsed : null,
        storageAvailable: storageAvail,
        temperature: typeof data.temperature === 'number' ? data.temperature : null,
        cpuTemp: typeof data.cpuTemp === 'number' ? data.cpuTemp : (typeof data.temperature === 'number' ? data.temperature : null),
        gpuUsage: typeof data.gpuUsage === 'number' ? data.gpuUsage : null,
        gpuVramTotal: typeof data.gpuVramTotal === 'number' ? data.gpuVramTotal : null,
        gpuVramUsed: typeof data.gpuVramUsed === 'number' ? data.gpuVramUsed : null,
        gpuTemp: typeof data.gpuTemp === 'number' ? data.gpuTemp : null,
        networkLatencyMs: typeof data.networkLatencyMs === 'number' ? data.networkLatencyMs : null,
        packetLossPercent: typeof data.packetLossPercent === 'number' ? data.packetLossPercent : null,
        downloadKbps: typeof data.downloadKbps === 'number' ? data.downloadKbps : null,
        uploadKbps: typeof data.uploadKbps === 'number' ? data.uploadKbps : null,
        batteryLevel: typeof data.battery === 'number' ? data.battery : null,
        charging: typeof data.charging === 'boolean' ? data.charging : null,
        chargingStatus: typeof data.chargingStatus === 'string' ? data.chargingStatus : null,
        batteryDrainRate: 8,
        source: data.source || data.platform || 'Simulator (Fallback)',
        platform: data.platform || data.source || 'Simulator (Fallback)',
        activeApps: parsedActiveApps,
        activeApplications: parsedActiveApps,
        installedApps: parsedInstalledApps,
        installedApplications: parsedInstalledApps,
      };
    } catch {
      return null; // Fallback to local simulator
    }
  },

  /** Fetch telemetry history samples from SQLite backend */
  async getTelemetryHistory(limit = 50): Promise<TelemetrySample[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/telemetry/history?limit=${limit}&t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  /** Store telemetry sample in SQLite backend */
  async postTelemetry(sample: TelemetrySample): Promise<boolean> {
    try {
      const ramTotal = 8;
      const ramUsed = (sample.ramUsage / 100) * ramTotal;
      const storageAvailable = ((100 - sample.storageUsage) / 100) * 128;

      const res = await fetch(`${API_BASE_URL}/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ramTotal,
          ramUsed,
          storageAvailable,
          battery: sample.batteryLevel,
          charging: false,
          temperature: sample.temperature,
          cpuUsage: sample.cpuUsage,
          platform: sample.platform || sample.source || 'Simulated Data',
          source: sample.source || sample.platform || 'Simulator',
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /** Fetch app profiles from SQLite backend */
  async getAppProfiles(): Promise<AppProfile[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/apps`);
      if (!res.ok) return SAMPLE_APPS;
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
      return SAMPLE_APPS;
    } catch {
      return SAMPLE_APPS;
    }
  },

  /** Store prediction in SQLite backend */
  async postPrediction(analysis: AppImpactAnalysis): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/predictions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName: analysis.app.name,
          ramImpact: analysis.ramImpact,
          cpuImpact: analysis.cpuImpact,
          storageImpact: analysis.storageImpact,
          batteryImpact: analysis.batteryImpact,
          thermalImpact: analysis.thermalImpact,
          overallImpact: analysis.overallImpact,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /** Store simulated run comparison in SQLite backend */
  async postSimulatedRun(comparison: SimulationComparison): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/simulated-runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName: comparison.app.name,
          predictedRam: comparison.predicted.ramImpact,
          actualRam: comparison.actual.ramUsage,
          predictedCpu: comparison.predicted.cpuImpact,
          actualCpu: comparison.actual.cpuUsage,
          predictedBattery: comparison.predicted.batteryImpact,
          actualBattery: comparison.actual.batteryLevel,
          predictedThermal: comparison.predicted.thermalImpact,
          actualThermal: comparison.actual.temperature,
          predictedStorage: comparison.predicted.storageImpact,
          actualStorage: comparison.actual.storageUsage,
          predictedOverall: comparison.predictedOverall,
          actualOverall: comparison.actualOverall,
          accuracyScore: comparison.accuracyScore,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /** Search real Google Play Store metadata */
  async searchPlayStoreApps(query: string): Promise<PlayStoreApp[]> {
    if (!query.trim()) return [];
    try {
      const res = await fetch(`${API_BASE_URL}/apps/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  /** Store completed app session analysis in SQLite backend */
  async postAppSession(session: AppSessionAnalysis): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/apps/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(session),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /** Fetch stored app session analyses */
  async getAppSessions(): Promise<AppSessionAnalysis[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/apps/sessions`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  /** Fetch installed Windows applications from backend */
  async getInstalledApps(): Promise<InstalledAppItem[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/apps/installed?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  /** Ask Performance Copilot deterministic reasoning engine */
  async askCopilot(question: string): Promise<CopilotResponse | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/copilot/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  /** FILE INTELLIGENCE APIs */

  async getFileStorageOverview(): Promise<StorageOverview | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/files/storage?t=${Date.now()}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async getFileDeclutterSummary(): Promise<DeclutterSummary | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/files/declutter?t=${Date.now()}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async getDuplicates(): Promise<DuplicateGroup[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/files/duplicates?t=${Date.now()}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async getRedundantFiles(): Promise<RedundantItem[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/files/redundant?t=${Date.now()}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async getDeveloperProjects(): Promise<DevProjectCleanup[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/files/developer-projects?t=${Date.now()}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async getLargeFiles(sort: 'size' | 'oldest' | 'recent' = 'size'): Promise<FileItemInfo[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/files/large?sort=${sort}&t=${Date.now()}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async getOldFiles(days = 90): Promise<FileItemInfo[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/files/old?days=${days}&t=${Date.now()}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async getSmartOrganization(): Promise<SmartOrganizationPreview[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/files/organization?t=${Date.now()}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async getSensitiveFiles(): Promise<SensitiveFileItem[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/files/sensitive?t=${Date.now()}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async getStorageGrowth(): Promise<StorageGrowthData | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/files/growth?t=${Date.now()}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async executeFileAction(actionType: 'recycle' | 'move', targetPaths: string[], destinationPath?: string): Promise<{ success: boolean; processedCount: number; errors: string[] }> {
    try {
      const res = await fetch(`${API_BASE_URL}/files/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionType, targetPaths, destinationPath }),
      });
      if (!res.ok) return { success: false, processedCount: 0, errors: ['Failed to execute file action'] };
      return await res.json();
    } catch (err: any) {
      return { success: false, processedCount: 0, errors: [err?.message || 'Network error'] };
    }
  },

  async rescanFilesystem(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/files/rescan`, { method: 'POST' });
      return res.ok;
    } catch {
      return false;
    }
  },

  async getExclusions(): Promise<string[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/files/exclusions`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async updateExclusions(action: 'add' | 'remove', folderPath: string): Promise<string[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/files/exclusions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, folderPath }),
      });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  /** DISCOVER APIs */
  async getDiscoverFeed(): Promise<import('../types').DiscoverPayload | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/discover?t=${Date.now()}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  /** ADAPTIVE DAY APIs */
  async getAdaptiveDayState(): Promise<AdaptiveDayState | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/adaptive-day?t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async dismissAdaptiveDayPattern(contextType: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/adaptive-day/dismiss-pattern`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contextType }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async applyAdaptiveDayAction(actionId: string): Promise<{ success: boolean; message: string } | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/adaptive-day/apply-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId }),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async updateAdaptiveDayPreferences(prefs: { isPaused?: boolean; locationPermissionEnabled?: boolean }): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/adaptive-day/preferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });
      return res.ok;
    } catch {
      return false;
    }
  },
};



