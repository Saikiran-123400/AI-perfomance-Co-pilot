import type {
  AppImpactAnalysis,
  AppProfile,
  ImpactRating,
  MetricComparison,
  SimulatedActualMetrics,
  SimulationComparison,
  TelemetrySample,
} from '../types';

const SEVERITY_RANK: Record<ImpactRating, number> = {
  LOW: 1,
  MEDIUM: 2,
  'MEDIUM-HIGH': 3,
  HIGH: 4,
  CRITICAL: 5,
};

function maxImpact(...ratings: ImpactRating[]): ImpactRating {
  return ratings.reduce((max, r) => (SEVERITY_RANK[r] > SEVERITY_RANK[max] ? r : max), 'LOW');
}

const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));
const round1 = (val: number) => Math.round(val * 10) / 10;

function valueToBand(metric: 'ram' | 'cpu' | 'storage' | 'temperature' | 'battery', value: number): ImpactRating {
  switch (metric) {
    case 'ram':
      return value >= 92 ? 'CRITICAL' : value >= 80 ? 'HIGH' : value >= 70 ? 'MEDIUM-HIGH' : value >= 55 ? 'MEDIUM' : 'LOW';
    case 'cpu':
      return value >= 88 ? 'CRITICAL' : value >= 70 ? 'HIGH' : value >= 50 ? 'MEDIUM-HIGH' : value >= 35 ? 'MEDIUM' : 'LOW';
    case 'storage':
      return value >= 95 ? 'CRITICAL' : value >= 88 ? 'HIGH' : value >= 75 ? 'MEDIUM-HIGH' : value >= 60 ? 'MEDIUM' : 'LOW';
    case 'temperature':
      return value >= 44 ? 'CRITICAL' : value >= 40 ? 'HIGH' : value >= 37 ? 'MEDIUM-HIGH' : value >= 34 ? 'MEDIUM' : 'LOW';
    case 'battery':
      return value <= 20 ? 'CRITICAL' : value <= 35 ? 'HIGH' : value <= 50 ? 'MEDIUM-HIGH' : value <= 70 ? 'MEDIUM' : 'LOW';
  }
}

export function runAppSimulation(
  app: AppProfile,
  currentTelemetry: TelemetrySample,
  prediction: AppImpactAnalysis
): SimulationComparison {
  // Generate simulated actual execution load with slight noise
  const ramAdded = (app.ramRequirementMB / 8192) * 100;
  const actualRam = clamp(currentTelemetry.ramUsage + ramAdded * 0.9 + (Math.random() - 0.5) * 4, 15, 98);

  const cpuBoost = app.cpuIntensity === 'extreme' ? 45 : app.cpuIntensity === 'high' ? 30 : app.cpuIntensity === 'medium' ? 18 : 8;
  const actualCpu = clamp(currentTelemetry.cpuUsage * 0.4 + cpuBoost + (Math.random() - 0.5) * 8, 10, 99);

  const storageAdded = (app.sizeMB / 131072) * 100;
  const actualStorage = clamp(currentTelemetry.storageUsage + storageAdded, 10, 99);

  const baseTemp = currentTelemetry.temperature ?? 35;
  const thermalBoost = app.cpuIntensity === 'extreme' ? 5.5 : app.cpuIntensity === 'high' ? 3.5 : app.cpuIntensity === 'medium' ? 1.8 : 0.6;
  const actualTemp = clamp(baseTemp + thermalBoost + (Math.random() - 0.5) * 1.2, 28, 48);

  const baseBattery = currentTelemetry.batteryLevel ?? 80;
  const batteryDrop = app.cpuIntensity === 'extreme' ? 7 : app.cpuIntensity === 'high' ? 5 : app.cpuIntensity === 'medium' ? 3 : 1;
  const actualBattery = clamp(baseBattery - batteryDrop, 1, 100);

  const actualMetrics: SimulatedActualMetrics = {
    ramUsage: round1(actualRam),
    cpuUsage: round1(actualCpu),
    storageUsage: round1(actualStorage),
    temperature: round1(actualTemp),
    batteryLevel: round1(actualBattery),
  };

  // Convert actual metrics to severity bands
  const actualBands = {
    ram: valueToBand('ram', actualMetrics.ramUsage),
    cpu: valueToBand('cpu', actualMetrics.cpuUsage),
    storage: valueToBand('storage', actualMetrics.storageUsage),
    thermal: valueToBand('temperature', actualMetrics.temperature),
    battery: valueToBand('battery', actualMetrics.batteryLevel),
  };

  const actualOverall = maxImpact(
    actualBands.ram,
    actualBands.cpu,
    actualBands.storage,
    actualBands.thermal,
    actualBands.battery
  );

  const getMatchRating = (predicted: ImpactRating, actual: ImpactRating): 'Exact' | 'Close' | 'Divergent' => {
    const diff = Math.abs(SEVERITY_RANK[predicted] - SEVERITY_RANK[actual]);
    if (diff === 0) return 'Exact';
    if (diff === 1) return 'Close';
    return 'Divergent';
  };

  const formatFreeStorage = (usagePercent: number) => `${(((100 - usagePercent) / 100) * 128).toFixed(1)} GB free`;

  const metricComparisons: MetricComparison[] = [
    {
      metric: 'RAM',
      predicted: prediction.ramImpact,
      actualValueFormatted: `${actualMetrics.ramUsage}%`,
      actualSeverity: actualBands.ram,
      matchRating: getMatchRating(prediction.ramImpact, actualBands.ram),
    },
    {
      metric: 'CPU',
      predicted: prediction.cpuImpact,
      actualValueFormatted: `${actualMetrics.cpuUsage}%`,
      actualSeverity: actualBands.cpu,
      matchRating: getMatchRating(prediction.cpuImpact, actualBands.cpu),
    },
    {
      metric: 'Battery',
      predicted: prediction.batteryImpact,
      actualValueFormatted: `${actualMetrics.batteryLevel}%`,
      actualSeverity: actualBands.battery,
      matchRating: getMatchRating(prediction.batteryImpact, actualBands.battery),
    },
    {
      metric: 'Thermal',
      predicted: prediction.thermalImpact,
      actualValueFormatted: `${actualMetrics.temperature.toFixed(1)}°C`,
      actualSeverity: actualBands.thermal,
      matchRating: getMatchRating(prediction.thermalImpact, actualBands.thermal),
    },
    {
      metric: 'Storage',
      predicted: prediction.storageImpact,
      actualValueFormatted: formatFreeStorage(actualMetrics.storageUsage),
      actualSeverity: actualBands.storage,
      matchRating: getMatchRating(prediction.storageImpact, actualBands.storage),
    },
  ];

  // Calculate Simulation Accuracy (0-100%)
  const scores = metricComparisons.map((item) => {
    const diff = Math.abs(SEVERITY_RANK[item.predicted] - SEVERITY_RANK[item.actualSeverity]);
    if (diff === 0) return 100;
    if (diff === 1) return 85;
    if (diff === 2) return 65;
    return 40;
  });

  const accuracyScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  return {
    app,
    predicted: prediction,
    actual: actualMetrics,
    predictedOverall: prediction.overallImpact,
    actualOverall,
    accuracyScore,
    metricComparisons,
  };
}
