import { diagnosisService } from './diagnosisService';
import { telemetryService } from './telemetryService';
import type {
  Diagnosis,
  Prediction,
  PredictionEngine,
  TelemetrySample,
} from '../types';

const HORIZON_MINUTES = 30;

/** Slope per sample, from a least-squares fit over the window. */
function slope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  values.forEach((y, x) => {
    num += (x - meanX) * (y - meanY);
    den += (x - meanX) ** 2;
  });
  return den === 0 ? 0 : num / den;
}

/** Rule-based engine. Implement PredictionEngine with a model to replace it. */
export const ruleBasedPredictionEngine: PredictionEngine = {
  name: 'rules-v1',

  predict(samples: TelemetrySample[], diagnosis: Diagnosis): Prediction {
    const window = samples.slice(-15);
    const latest = window[window.length - 1];
    const notes: string[] = [];

    const cpuSlope = slope(window.map((s) => s.cpuUsage));
    const validGpu = window.map((s) => s.gpuUsage).filter((g): g is number => typeof g === 'number');
    const gpuSlope = validGpu.length >= 2 ? slope(validGpu) : 0;
    const validTemps = window.map((s) => s.temperature).filter((t): t is number => typeof t === 'number');
    const tempSlope = validTemps.length >= 2 ? slope(validTemps) : 0;

    // Each degree of upward heat trend costs more than a point of CPU/GPU trend.
    const projectedDrop = Math.max(0, tempSlope * 8 + (cpuSlope + gpuSlope) * 0.4 - 1) * 1.5;
    const predictedHealthScore = Math.round(
      Math.min(100, Math.max(0, diagnosis.healthScore - projectedDrop))
    );

    const delta = predictedHealthScore - diagnosis.healthScore;
    const trend = delta <= -5 ? 'degrading' : delta >= 5 ? 'improving' : 'stable';

    const batteryMinutesRemaining =
      typeof latest.batteryLevel === 'number' && latest.batteryDrainRate > 0
        ? Math.round((latest.batteryLevel / latest.batteryDrainRate) * 60)
        : null;

    if (tempSlope > 0.25 && (cpuSlope > 0.5 || gpuSlope > 0.5)) {
      notes.push('Thermal Pressure: Temperature climbing under CPU/GPU load; throttling & performance degradation likely.');
    } else if (tempSlope > 0.25) {
      notes.push('Temperature is climbing; throttling is likely if it continues.');
    }
    if (cpuSlope > 1) notes.push('CPU load is trending up.');
    if (gpuSlope > 1) notes.push('GPU workload is increasing.');

    if (batteryMinutesRemaining !== null && batteryMinutesRemaining < 90) {
      notes.push(`About ${batteryMinutesRemaining} minutes of battery left at this rate.`);
    }

    notes.push('FPS telemetry unavailable');

    if (notes.length === 1) notes.unshift('No degradation expected in the next half hour.');

    return {
      timestamp: latest.timestamp,
      predictedHealthScore,
      horizonMinutes: HORIZON_MINUTES,
      batteryMinutesRemaining,
      trend,
      // More history means a more trustworthy slope.
      confidence: Math.round(Math.min(0.9, 0.3 + window.length * 0.04) * 100) / 100,
      notes,
    };
  },
};

let engine: PredictionEngine = ruleBasedPredictionEngine;

export function setPredictionEngine(next: PredictionEngine): void {
  engine = next;
}

export const predictionService = {
  current(): Prediction {
    const samples = telemetryService.history(30);
    if (samples.length === 0) samples.push(telemetryService.latest());
    return engine.predict(samples, diagnosisService.current());
  },
  engineName(): string {
    return engine.name;
  },
};
