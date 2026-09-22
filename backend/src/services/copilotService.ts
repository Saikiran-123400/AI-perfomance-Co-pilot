import { db } from '../database.js';
import { groqService } from './groqService.js';

export interface CopilotAnalysisResult {
  question: string;
  answer: string;
  explanation: string;
  evidence: string[];
  recommendations: string[];
  recommendation: string;
  severity: 'ok' | 'warning' | 'critical';
  timestamp: number;
}

interface ActiveAppItem {
  pid?: number;
  name: string;
  cpuPercent?: number;
  cpuFormatted?: string;
  ramMb?: number;
  ramFormatted?: string;
  startTime?: number | null;
}

export const copilotService = {
  async analyzeQuestion(question: string): Promise<CopilotAnalysisResult> {
    const qLower = (question || '').toLowerCase().trim();
    const now = Date.now();

    // Query latest telemetry record from SQLite devices table
    const row = db.prepare('SELECT * FROM devices ORDER BY id DESC LIMIT 1').get() as
      | {
          id: number;
          ram_total: number | null;
          ram_used: number | null;
          ram_available: number | null;
          storage_total: number | null;
          storage_used: number | null;
          storage_available: number | null;
          battery: number | null;
          charging: number | null;
          temperature: number | null;
          cpu_usage: number | null;
          gpu_usage: number | null;
          gpu_vram_total: number | null;
          gpu_vram_used: number | null;
          gpu_temp: number | null;
          network_latency: number | null;
          packet_loss: number | null;
          download_kbps: number | null;
          upload_kbps: number | null;
          charging_status: string | null;
          platform?: string;
          source: string;
          active_apps?: string | null;
          created_at: string;
        }
      | undefined;

    if (!row) {
      const answer = 'No device telemetry is currently available in the database.';
      const evidence = ['Telemetry: Unavailable'];
      const recs = ['Start the Python telemetry agent (python monitor.py) to stream live laptop metrics.'];
      return {
        question,
        answer,
        explanation: answer,
        evidence,
        recommendations: recs,
        recommendation: recs[0],
        severity: 'warning',
        timestamp: now,
      };
    }

    // Parse active apps
    let activeApps: ActiveAppItem[] = [];
    if (row.active_apps) {
      try {
        activeApps = JSON.parse(row.active_apps);
      } catch {}
    }

    const cpuUsage = typeof row.cpu_usage === 'number' ? Math.round(row.cpu_usage) : 0;
    const ramTotal = row.ram_total || 16;
    const ramUsed = row.ram_used || (ramTotal * 0.5);
    const ramUsage = Math.round((ramUsed / ramTotal) * 100);
    const gpuUsage = typeof row.gpu_usage === 'number' ? Math.round(row.gpu_usage) : null;
    const temp = row.temperature !== null && row.temperature !== undefined ? row.temperature : null;
    const battery = row.battery !== null && row.battery !== undefined ? row.battery : null;
    const charging = row.charging === 1;
    const chargingStatus = row.charging_status || (charging ? 'Charging' : 'Discharging');
    const latency = row.network_latency !== null && row.network_latency !== undefined ? row.network_latency : null;

    // Top memory and CPU app contributors
    const topRamApp = activeApps.length > 0 ? [...activeApps].sort((a, b) => (b.ramMb || 0) - (a.ramMb || 0))[0] : null;
    const topCpuApp = activeApps.length > 0 ? [...activeApps].sort((a, b) => (b.cpuPercent || 0) - (a.cpuPercent || 0))[0] : null;

    const topRamAppStr = topRamApp
      ? `${topRamApp.name}: ${topRamApp.ramFormatted || (topRamApp.ramMb ? (topRamApp.ramMb >= 1024 ? `${(topRamApp.ramMb / 1024).toFixed(1)} GB` : `${Math.round(topRamApp.ramMb)} MB`) : 'N/A')}`
      : null;

    // 1. TRY GROQ LLM API FIRST IF CONFIGURED
    if (groqService.isConfigured()) {
      const telemetryContext = {
        source: row.source || row.platform || 'Windows Laptop',
        platform: row.platform || row.source || 'Windows Laptop',
        cpuUsagePercent: cpuUsage,
        ram: {
          usagePercent: ramUsage,
          usedGb: ramUsed.toFixed(1),
          totalGb: ramTotal.toFixed(1),
        },
        gpu: gpuUsage !== null ? {
          usagePercent: gpuUsage,
          vramUsedMb: row.gpu_vram_used,
          vramTotalMb: row.gpu_vram_total,
          tempC: row.gpu_temp,
        } : 'Unavailable',
        temperatureC: temp !== null ? temp.toFixed(1) : 'Unavailable',
        battery: battery !== null ? {
          levelPercent: battery,
          chargingStatus: chargingStatus,
        } : 'Unavailable',
        network: latency !== null ? {
          latencyMs: Math.round(latency),
          packetLossPercent: row.packet_loss,
        } : 'Unavailable',
        activeApplications: activeApps.slice(0, 6).map((a) => ({
          name: a.name,
          pid: a.pid,
          cpuPercent: a.cpuPercent,
          memoryMb: a.ramMb,
        })),
      };

      const groqResult = await groqService.analyzeDeviceTelemetry(question, telemetryContext);
      if (groqResult) {
        return {
          question,
          answer: groqResult.answer,
          explanation: groqResult.answer,
          evidence: groqResult.evidence,
          recommendations: groqResult.recommendations,
          recommendation: groqResult.recommendations.join(' '),
          severity: groqResult.severity,
          timestamp: now,
        };
      }
    }

    // 2. DETERMINISTIC LOCAL REASONING FALLBACK (If Groq API key is missing or call fails)

    // "Why is my device slow?"
    if (qLower.includes('slow') || qLower.includes('lag') || qLower.includes('sluggish') || qLower.includes('slowdown')) {
      if (ramUsage >= 80) {
        const answer = `Your device is currently under high memory pressure. System RAM usage is ${ramUsage}%. ${topRamApp ? `${topRamApp.name} is using approximately ${topRamApp.ramFormatted || `${Math.round(topRamApp.ramMb || 0)} MB`}.` : ''} High memory pressure forces OS paging and leads to system sluggishness.`;
        const evidence = [
          `RAM usage: ${ramUsage}% (${ramUsed.toFixed(1)} / ${ramTotal.toFixed(1)} GB)`,
          topRamAppStr ? topRamAppStr : `CPU usage: ${cpuUsage}%`,
          `CPU usage: ${cpuUsage}%`,
          latency !== null ? `Network latency: ${Math.round(latency)} ms` : 'Network: Unavailable',
          `Active applications: ${activeApps.length} running`,
        ];
        const recommendations = topRamApp
          ? [`Close unused ${topRamApp.name} tabs or high-memory applications.`, 'Restart background browser processes to reclaim memory.']
          : ['Close high-memory background applications to free up physical RAM.'];
        const severity: 'warning' | 'critical' = ramUsage >= 90 ? 'critical' : 'warning';
        return {
          question,
          answer,
          explanation: answer,
          evidence,
          recommendations,
          recommendation: recommendations.join(' '),
          severity,
          timestamp: now,
        };
      } else if (cpuUsage >= 75) {
        const answer = `Your device is experiencing heavy CPU processor load. CPU utilization is currently at ${cpuUsage}%. ${topCpuApp ? `${topCpuApp.name} is consuming approximately ${topCpuApp.cpuPercent || 0}% CPU.` : ''} Continuous high processor load slows app execution and UI rendering.`;
        const evidence = [
          `CPU usage: ${cpuUsage}%`,
          topCpuApp ? `${topCpuApp.name}: ${topCpuApp.cpuPercent || 0}% CPU` : `RAM usage: ${ramUsage}%`,
          `RAM usage: ${ramUsage}%`,
          temp !== null ? `Temperature: ${temp.toFixed(1)}°C` : 'Temperature: Unavailable',
          `Active applications: ${activeApps.length} running`,
        ];
        const recommendations = topCpuApp
          ? [`Exit or pause processor-heavy tasks in ${topCpuApp.name}.`, 'Close unused background tasks to reduce CPU contention.']
          : ['Close processor-intensive applications or active background renders.'];
        return {
          question,
          answer,
          explanation: answer,
          evidence,
          recommendations,
          recommendation: recommendations.join(' '),
          severity: 'warning',
          timestamp: now,
        };
      } else {
        const answer = `Your hardware metrics are operating within normal baseline levels. CPU load is at ${cpuUsage}% and RAM usage is at ${ramUsage}%. No severe system bottleneck detected.`;
        const evidence = [
          `CPU usage: ${cpuUsage}%`,
          `RAM usage: ${ramUsage}% (${ramUsed.toFixed(1)} / ${ramTotal.toFixed(1)} GB)`,
          gpuUsage !== null ? `GPU usage: ${gpuUsage}%` : 'GPU: Unavailable',
          temp !== null ? `Temperature: ${temp.toFixed(1)}°C` : 'Temperature: Unavailable',
          latency !== null ? `Network latency: ${Math.round(latency)} ms` : 'Network: Unavailable',
        ];
        const recommendations = ['No critical performance bottlenecks detected. System is running smoothly.'];
        return {
          question,
          answer,
          explanation: answer,
          evidence,
          recommendations,
          recommendation: recommendations[0],
          severity: 'ok',
          timestamp: now,
        };
      }
    }

    // "What's using my RAM?"
    if (qLower.includes('ram') || qLower.includes('memory')) {
      const top3Apps = activeApps.length > 0
        ? activeApps.slice(0, 3).map((a) => `${a.name}: ${a.ramFormatted || `${Math.round(a.ramMb || 0)} MB`}`)
        : ['No active application RAM breakdown available'];

      const answer = `Total system RAM is ${ramUsage}% full (${ramUsed.toFixed(1)} GB used out of ${ramTotal.toFixed(1)} GB total). ${topRamApp ? `${topRamApp.name} is currently the largest memory consumer.` : ''}`;
      const evidence = [
        `RAM usage: ${ramUsage}%`,
        `Memory used: ${ramUsed.toFixed(1)} GB / ${ramTotal.toFixed(1)} GB`,
        ...top3Apps,
      ];
      const recommendations = topRamApp
        ? [`Close unused tabs or windows in ${topRamApp.name}.`, 'Inspect memory usage trends in App Analyzer to prevent RAM depletion.']
        : ['Close unused background applications to free up physical memory.'];
      const severity: 'ok' | 'warning' | 'critical' = ramUsage >= 85 ? 'critical' : (ramUsage >= 75 ? 'warning' : 'ok');

      return {
        question,
        answer,
        explanation: answer,
        evidence,
        recommendations,
        recommendation: recommendations.join(' '),
        severity,
        timestamp: now,
      };
    }

    // "Why is my temperature high?" / "Why is my temperature increasing?"
    if (qLower.includes('temp') || qLower.includes('temperature') || qLower.includes('hot') || qLower.includes('heat') || qLower.includes('thermal')) {
      if (temp !== null) {
        const answer = `Internal system temperature is currently ${temp.toFixed(1)}°C. Heat generation is driven primarily by CPU workload (${cpuUsage}% load) and GPU activity ${gpuUsage !== null ? `(${gpuUsage}% load)` : ''}.`;
        const evidence = [
          `Temperature: ${temp.toFixed(1)}°C`,
          `CPU usage: ${cpuUsage}%`,
          gpuUsage !== null ? `GPU usage: ${gpuUsage}%` : 'GPU: Unavailable',
          battery !== null ? `Battery level: ${battery}%` : 'Battery: Unavailable',
        ];
        const recommendations = temp >= 40
          ? ['Reduce intense CPU/GPU workloads and ensure hardware cooling vents are clear.', 'Avoid running continuous 3D or video rendering tasks simultaneously.']
          : ['Temperature is within safe operating parameters.'];
        const severity: 'ok' | 'warning' | 'critical' = temp >= 50 ? 'critical' : (temp >= 40 ? 'warning' : 'ok');

        return {
          question,
          answer,
          explanation: answer,
          evidence,
          recommendations,
          recommendation: recommendations.join(' '),
          severity,
          timestamp: now,
        };
      } else {
        const answer = `Hardware thermal sensor readings are unavailable on this platform. Thermal status is estimated using CPU workload (${cpuUsage}%).`;
        const evidence = [
          'Temperature: Unavailable',
          `CPU usage: ${cpuUsage}%`,
          `RAM usage: ${ramUsage}%`,
        ];
        const recommendations = ['Keep your device on a hard, flat surface to maintain optimal airflow.'];
        return {
          question,
          answer,
          explanation: answer,
          evidence,
          recommendations,
          recommendation: recommendations[0],
          severity: cpuUsage >= 75 ? 'warning' : 'ok',
          timestamp: now,
        };
      }
    }

    // "Why is my battery draining?"
    if (qLower.includes('battery') || qLower.includes('drain') || qLower.includes('power') || qLower.includes('charging')) {
      if (battery !== null) {
        const answer = `Battery level is currently at ${battery}% (${chargingStatus}). Power drain is influenced by CPU processing load (${cpuUsage}%), display brightness, and active background apps.`;
        const evidence = [
          `Battery level: ${battery}%`,
          `Charging status: ${chargingStatus}`,
          `CPU usage: ${cpuUsage}%`,
          `RAM usage: ${ramUsage}%`,
          `Active applications: ${activeApps.length} running`,
        ];
        const recommendations = charging
          ? ['Device is currently plugged in and receiving power.']
          : ['Lower display brightness and close unnecessary background apps.', 'Enable OS Battery Saver mode if running low.'];
        const severity: 'ok' | 'warning' = !charging && battery <= 20 ? 'warning' : 'ok';

        return {
          question,
          answer,
          explanation: answer,
          evidence,
          recommendations,
          recommendation: recommendations.join(' '),
          severity,
          timestamp: now,
        };
      } else {
        const answer = 'Battery telemetry is unavailable on this desktop system AC power configuration.';
        const evidence = [
          'Battery level: Unavailable (AC Power)',
          `CPU usage: ${cpuUsage}%`,
          `RAM usage: ${ramUsage}%`,
        ];
        const recommendations = ['Device is running on direct AC mains power.'];
        return {
          question,
          answer,
          explanation: answer,
          evidence,
          recommendations,
          recommendation: recommendations[0],
          severity: 'ok',
          timestamp: now,
        };
      }
    }

    // "Is my network causing the problem?"
    if (qLower.includes('net') || qLower.includes('network') || qLower.includes('ping') || qLower.includes('wifi') || qLower.includes('internet')) {
      if (latency !== null) {
        const answer = `Your network response latency (ping) is currently ${Math.round(latency)} ms. ${latency >= 100 ? 'High network ping is causing latency in cloud and web communications.' : 'Network connection latency is low and stable.'}`;
        const evidence = [
          `Network latency: ${Math.round(latency)} ms`,
          row.packet_loss !== null ? `Packet loss: ${row.packet_loss}%` : 'Packet loss: 0%',
          row.download_kbps !== null ? `Download throughput: ${row.download_kbps >= 1024 ? `${(row.download_kbps / 1024).toFixed(1)} MB/s` : `${Math.round(row.download_kbps)} KB/s`}` : 'Download throughput: N/A',
        ];
        const recommendations = latency >= 100
          ? ['Check Wi-Fi signal quality or switch to Ethernet.', 'Pause large background file downloads or cloud synchronizations.']
          : ['Network connection is operating normally.'];
        const severity: 'ok' | 'warning' = latency >= 150 ? 'warning' : 'ok';

        return {
          question,
          answer,
          explanation: answer,
          evidence,
          recommendations,
          recommendation: recommendations.join(' '),
          severity,
          timestamp: now,
        };
      } else {
        const answer = 'Network latency measurements are currently unavailable or unreachable.';
        const evidence = [
          'Network latency: Unavailable',
          `CPU usage: ${cpuUsage}%`,
        ];
        const recommendations = ['Verify active Wi-Fi or Ethernet adapter connection.'];
        return {
          question,
          answer,
          explanation: answer,
          evidence,
          recommendations,
          recommendation: recommendations[0],
          severity: 'ok',
          timestamp: now,
        };
      }
    }

    // "Which application is affecting performance?" / "Is an application affecting performance?"
    if (qLower.includes('app') || qLower.includes('process') || qLower.includes('application') || qLower.includes('affecting')) {
      if (topRamApp || topCpuApp) {
        const answer = `Based on real-time process telemetry, ${topRamApp ? `${topRamApp.name} is consuming the most RAM (${topRamApp.ramFormatted || `${Math.round(topRamApp.ramMb || 0)} MB`})` : ''} ${topCpuApp && topCpuApp.name !== topRamApp?.name ? `and ${topCpuApp.name} is consuming the most CPU (${topCpuApp.cpuPercent || 0}%).` : '.'}`;
        const evidence = [
          topRamAppStr ? `Top RAM app: ${topRamAppStr}` : 'Top RAM app: N/A',
          topCpuApp ? `Top CPU app: ${topCpuApp.name} (${topCpuApp.cpuPercent || 0}% CPU)` : 'Top CPU app: N/A',
          `Total RAM usage: ${ramUsage}%`,
          `Total CPU usage: ${cpuUsage}%`,
          `Active applications count: ${activeApps.length}`,
        ];
        const recommendations = topRamApp
          ? [`Inspect ${topRamApp.name} in App Analyzer or close it to reclaim resources.`, 'Close background tasks not currently in active use.']
          : ['Close unnecessary background applications.'];
        const severity: 'ok' | 'warning' = (topRamApp?.ramMb || 0) > 3000 || (topCpuApp?.cpuPercent || 0) > 50 ? 'warning' : 'ok';

        return {
          question,
          answer,
          explanation: answer,
          evidence,
          recommendations,
          recommendation: recommendations.join(' '),
          severity,
          timestamp: now,
        };
      } else {
        const answer = 'No single active application is dominating system resources right now.';
        const evidence = [
          `Total CPU usage: ${cpuUsage}%`,
          `Total RAM usage: ${ramUsage}%`,
          'Active apps: None consuming high resource thresholds',
        ];
        const recommendations = ['System resources are balanced.'];
        return {
          question,
          answer,
          explanation: answer,
          evidence,
          recommendations,
          recommendation: recommendations[0],
          severity: 'ok',
          timestamp: now,
        };
      }
    }

    // General / Default Local Analysis ("What should I do right now?")
    const answer = `Current system status: RAM is at ${ramUsage}% (${ramUsed.toFixed(1)}/${ramTotal.toFixed(1)} GB), CPU load is at ${cpuUsage}%, ${gpuUsage !== null ? `GPU is at ${gpuUsage}%,` : ''} and network ping is ${latency !== null ? `${Math.round(latency)} ms` : 'Unavailable'}. ${topRamApp ? `${topRamApp.name} is the largest memory contributor.` : ''}`;
    const evidence = [
      `CPU usage: ${cpuUsage}%`,
      `RAM usage: ${ramUsage}% (${ramUsed.toFixed(1)} / ${ramTotal.toFixed(1)} GB)`,
      gpuUsage !== null ? `GPU usage: ${gpuUsage}%` : 'GPU: Unavailable',
      temp !== null ? `Temperature: ${temp.toFixed(1)}°C` : 'Temperature: Unavailable',
      latency !== null ? `Network latency: ${Math.round(latency)} ms` : 'Network: Unavailable',
      topRamAppStr ? `Top RAM app: ${topRamAppStr}` : `Active apps: ${activeApps.length} running`,
    ];
    const recommendations = ramUsage >= 80 || cpuUsage >= 75
      ? ['Close resource-heavy background applications to maintain responsiveness.', 'Check App Analyzer for individual application footprints.']
      : ['System is running smoothly. Continue regular monitoring.'];
    const severity: 'ok' | 'warning' | 'critical' = ramUsage >= 85 || cpuUsage >= 80 ? 'warning' : 'ok';

    return {
      question,
      answer,
      explanation: answer,
      evidence,
      recommendations,
      recommendation: recommendations.join(' '),
      severity,
      timestamp: now,
    };
  },
};
