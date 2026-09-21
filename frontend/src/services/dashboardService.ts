import type { DashboardData } from '../types';
import { telemetryService } from './telemetryService';
import { diagnosisService } from './diagnosisService';
import { predictionService } from './predictionService';

export async function fetchDashboardData(signal?: AbortSignal): Promise<DashboardData> {
  // Single source of truth: fetch latest and history via telemetryService
  const latest = await telemetryService.fetchLatest();
  const history = await telemetryService.fetchHistory(50);
  const diagnosis = diagnosisService.current();
  const prediction = predictionService.current();

  return {
    telemetry: {
      latest,
      history,
      source: latest.source || 'Simulator (Fallback)',
    },
    diagnosis,
    prediction,
  };
}
