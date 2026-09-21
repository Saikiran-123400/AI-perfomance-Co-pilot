import type { TelemetrySample } from '../types';
import { apiClient } from './apiClient';
import { simulatedTelemetrySource } from './simulatedTelemetrySource';

let cachedLatest: TelemetrySample | null = null;
let cachedHistory: TelemetrySample[] = [];

export const telemetryService = {
  /** Fetch latest telemetry from real backend API, falling back to simulator if offline */
  async fetchLatest(): Promise<TelemetrySample> {
    const backendLatest = await apiClient.getLatestTelemetry();

    if (
      backendLatest &&
      backendLatest.source !== 'Simulator' &&
      backendLatest.source !== 'Simulated Data' &&
      backendLatest.source !== 'Simulator (Fallback)'
    ) {
      cachedLatest = backendLatest;
      // Keep real samples in history buffer
      if (
        cachedHistory.length === 0 ||
        cachedHistory[cachedHistory.length - 1].timestamp !== backendLatest.timestamp
      ) {
        cachedHistory = [...cachedHistory, backendLatest].slice(-100);
      }
      return backendLatest;
    }

    // Genuine fallback to local simulator if real live telemetry is unavailable
    const fallbackSample = simulatedTelemetrySource.read(cachedLatest ?? undefined);
    fallbackSample.source = 'Simulator (Fallback)';
    fallbackSample.platform = 'Simulator (Fallback)';
    cachedLatest = fallbackSample;
    return fallbackSample;
  },

  /** Fetch telemetry history array from real SQLite backend */
  async fetchHistory(limit = 50): Promise<TelemetrySample[]> {
    const backendHistory = await apiClient.getTelemetryHistory(limit);
    if (backendHistory && backendHistory.length > 0) {
      cachedHistory = backendHistory;
      return backendHistory;
    }
    return cachedHistory;
  },

  /** Synchronously get latest cached sample */
  latest(): TelemetrySample {
    if (!cachedLatest) {
      const fallback = simulatedTelemetrySource.read();
      fallback.source = 'Simulator (Fallback)';
      fallback.platform = 'Simulator (Fallback)';
      return fallback;
    }
    return cachedLatest;
  },

  /** Synchronously get cached history array */
  history(limit = 30): TelemetrySample[] {
    if (cachedHistory.length === 0) {
      return [this.latest()];
    }
    return cachedHistory.slice(-limit);
  },
};
