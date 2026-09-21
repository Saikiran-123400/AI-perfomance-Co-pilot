import type { AppProfile, AppImpactAnalysis, SimulationComparison, TelemetrySample, PlayStoreApp, AppSessionAnalysis, InstalledAppItem } from '../types';
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
        batteryLevel: typeof data.battery === 'number' ? data.battery : null,
        charging: typeof data.charging === 'boolean' ? data.charging : null,
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
};
