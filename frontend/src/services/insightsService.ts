import type { TelemetrySample } from '../types';

export type InsightSeverity = 'Info' | 'Warning';

export interface InsightItem {
  id: string;
  title: string;
  explanation: string;
  supportingMetric: string;
  timePeriod: string;
  severity: InsightSeverity;
}

export function analyzeTelemetryHistory(samples: TelemetrySample[]): InsightItem[] {
  // If insufficient historical data points exist (< 3 samples), return empty list
  if (!samples || samples.length < 3) {
    return [];
  }

  const insights: InsightItem[] = [];
  const count = samples.length;

  const firstSample = samples[0];
  const lastSample = samples[samples.length - 1];

  // Calculate Time Window Span
  const timeSpanMs = Math.max(0, lastSample.timestamp - firstSample.timestamp);
  const minutes = Math.round(timeSpanMs / (1000 * 60));
  const timePeriodText = minutes > 0 ? `Past ${minutes} min` : `Past ${count} samples`;

  // 1. RAM Usage Pattern Analysis
  const highRamSamples = samples.filter((s) => s.ramUsage >= 75);
  const ramRatio = highRamSamples.length / count;
  const avgRam = samples.reduce((sum, s) => sum + s.ramUsage, 0) / count;

  if (ramRatio >= 0.4) {
    insights.push({
      id: 'ins-ram-high',
      title: 'RAM Usage is Frequently High',
      explanation: 'System RAM consistently operates near capacity, reducing memory headroom for background processes.',
      supportingMetric: `High RAM (≥75%) recorded in ${(ramRatio * 100).toFixed(0)}% of samples (Average: ${avgRam.toFixed(0)}%).`,
      timePeriod: timePeriodText,
      severity: 'Warning',
    });
  }

  // 2. CPU Spikes Pattern Analysis
  const cpuSpikeSamples = samples.filter((s) => s.cpuUsage >= 65);
  const cpuRatio = cpuSpikeSamples.length / count;
  const maxCpu = Math.max(...samples.map((s) => s.cpuUsage));
  const avgCpu = samples.reduce((sum, s) => sum + s.cpuUsage, 0) / count;

  if (cpuRatio >= 0.3) {
    insights.push({
      id: 'ins-cpu-spikes',
      title: 'CPU Usage Has Frequent Spikes',
      explanation: 'Processor experiences recurring heavy load spikes, indicating active background processing or intense app activity.',
      supportingMetric: `CPU spikes (≥65%) detected in ${(cpuRatio * 100).toFixed(0)}% of samples (Peak: ${maxCpu.toFixed(0)}%, Average: ${avgCpu.toFixed(0)}%).`,
      timePeriod: timePeriodText,
      severity: 'Warning',
    });
  }

  // 3. Battery Drain Pattern Analysis
  const avgDrain = samples.reduce((sum, s) => sum + (s.batteryDrainRate ?? 8), 0) / count;
  const batteryDiff =
    firstSample.batteryLevel !== null && lastSample.batteryLevel !== null
      ? firstSample.batteryLevel - lastSample.batteryLevel
      : 0;

  if (avgDrain >= 12 || batteryDiff >= 5) {
    insights.push({
      id: 'ins-battery-drain',
      title: 'Battery is Draining Quickly',
      explanation: 'Power consumption is elevated over recent operating cycles.',
      supportingMetric: `Battery level decreased by ${Math.max(0, batteryDiff).toFixed(0)}% over recorded window (Drain rate: ~${avgDrain.toFixed(0)}%/hr).`,
      timePeriod: timePeriodText,
      severity: 'Warning',
    });
  }

  // 4. Temperature & CPU Correlation Analysis
  const validTempSamples = samples.filter((s): s is TelemetrySample & { temperature: number } => s.temperature !== null);
  const highCpuSamples = validTempSamples.filter((s) => s.cpuUsage >= 50);
  const lowCpuSamples = validTempSamples.filter((s) => s.cpuUsage < 50);

  if (highCpuSamples.length > 0 && lowCpuSamples.length > 0) {
    const avgHighCpuTemp = highCpuSamples.reduce((sum, s) => sum + s.temperature, 0) / highCpuSamples.length;
    const avgLowCpuTemp = lowCpuSamples.reduce((sum, s) => sum + s.temperature, 0) / lowCpuSamples.length;
    const tempDiff = avgHighCpuTemp - avgLowCpuTemp;

    if (tempDiff >= 2.0) {
      const maxTemp = Math.max(...validTempSamples.map((s) => s.temperature));
      insights.push({
        id: 'ins-thermal-cpu-corr',
        title: 'Temperature Increases During High CPU Usage',
        explanation: 'Thermal readings directly correlate with processor workload spikes.',
        supportingMetric: `Internal temperature is ${tempDiff.toFixed(1)}°C higher during high CPU activity (Peak temp: ${maxTemp.toFixed(1)}°C).`,
        timePeriod: timePeriodText,
        severity: 'Warning',
      });
    }
  }

  // 5. Storage Usage Pattern Analysis
  const firstStorage = firstSample.storageUsage ?? 64;
  const lastStorage = lastSample.storageUsage ?? 64;
  const storageDiff = lastStorage - firstStorage;

  if (lastStorage >= 75 || storageDiff >= 1.5) {
    const isHigh = lastStorage >= 75;
    insights.push({
      id: 'ins-storage-usage',
      title: isHigh ? 'High Storage Usage' : 'Storage is Gradually Filling',
      explanation: isHigh
        ? 'Storage usage is approaching a high capacity level on the device.'
        : 'Internal storage usage shows a steady upward trend as temporary files accumulate.',
      supportingMetric: isHigh
        ? `Storage capacity is ${lastStorage.toFixed(0)}% full.`
        : `Storage usage increased by +${storageDiff.toFixed(1)}% across recorded points (Current: ${lastStorage.toFixed(0)}% used).`,
      timePeriod: timePeriodText,
      severity: isHigh ? 'Warning' : 'Info',
    });
  }

  // 6. Default: Stable Performance Pattern
  if (insights.length === 0) {
    const avgTempStr =
      validTempSamples.length > 0
        ? `${(validTempSamples.reduce((sum, s) => sum + s.temperature, 0) / validTempSamples.length).toFixed(1)}°C`
        : 'Unavailable';
    insights.push({
      id: 'ins-stable-perf',
      title: 'Performance is Relatively Stable',
      explanation: 'System telemetry shows consistent performance metrics with zero critical spikes or thermal anomalies.',
      supportingMetric: `CPU average: ${avgCpu.toFixed(0)}% | RAM average: ${avgRam.toFixed(0)}% | Avg Temp: ${avgTempStr} across ${count} samples.`,
      timePeriod: timePeriodText,
      severity: 'Info',
    });
  }

  return insights;
}
