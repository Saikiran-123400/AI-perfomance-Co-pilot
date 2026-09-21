import type { AppImpactAnalysis, TelemetrySample } from '../types';

export interface AppRecommendationResult {
  summaryReason: string;
  recommendedActions: string[];
}

export function generateAppRecommendations(
  analysis: AppImpactAnalysis,
  telemetry: TelemetrySample
): AppRecommendationResult {
  const highImpacts: string[] = [];
  const actions: string[] = [];

  // Check individual resource conditions
  const isHighRam = analysis.ramImpact === 'HIGH' || analysis.ramImpact === 'CRITICAL';
  const isHighCpu = analysis.cpuImpact === 'HIGH' || analysis.cpuImpact === 'CRITICAL';
  const isHighStorage = analysis.storageImpact === 'HIGH' || analysis.storageImpact === 'CRITICAL';
  const isHighThermal = analysis.thermalImpact === 'HIGH' || analysis.thermalImpact === 'CRITICAL';
  const isHighBattery = analysis.batteryImpact === 'HIGH' || analysis.batteryImpact === 'CRITICAL';

  if (isHighRam) {
    const ramText = telemetry.ramTotal
      ? `${telemetry.ramUsed?.toFixed(1) ?? '?'}/${telemetry.ramTotal.toFixed(1)} GB`
      : `${telemetry.ramUsage}%`;
    highImpacts.push(`high RAM usage (${ramText})`);
    actions.push('Close heavy background applications to free up system memory.');
  }

  if (isHighCpu) {
    highImpacts.push(`sustained CPU load (${telemetry.cpuUsage.toFixed(0)}%)`);
    actions.push('Terminate active CPU-intensive processes before launching.');
  }

  if (isHighThermal) {
    const tempText = telemetry.temperature !== null ? `${telemetry.temperature.toFixed(1)}°C` : 'Unavailable';
    highImpacts.push(`elevated device temperature (${tempText})`);
    actions.push('Allow the device to cool down before running heavy apps.');
  }

  if (isHighBattery) {
    const batteryText = telemetry.batteryLevel !== null ? `${telemetry.batteryLevel}%` : 'Unavailable';
    highImpacts.push(`low remaining battery (${batteryText})`);
    actions.push('Connect the device to a charger or enable Battery Saver mode.');
  }

  if (isHighStorage) {
    const storageText = telemetry.storageAvailable
      ? `${telemetry.storageAvailable.toFixed(1)} GB remaining`
      : `${(100 - telemetry.storageUsage).toFixed(0)}% remaining`;
    highImpacts.push(`limited free storage (${storageText})`);
    actions.push('Free additional storage by clearing cached media files or downloads.');
  }

  // Handle moderate conditions if no critical/high impacts detected
  if (actions.length === 0) {
    if (analysis.overallImpact === 'MEDIUM-HIGH' || analysis.overallImpact === 'MEDIUM') {
      highImpacts.push('moderate resource allocation requirements');
      actions.push('Close unused apps for optimal performance.');
      actions.push('Keep the device in a cool environment during extended sessions.');
    } else {
      highImpacts.push('healthy system operating parameters');
      actions.push('No action required. Your device is ready to run this app smoothly.');
    }
  }

  // Formulate summary reason ("Why this prediction?")
  let summaryReason = '';
  if (highImpacts.length === 1) {
    summaryReason = `The device currently has ${highImpacts[0]}.`;
  } else if (highImpacts.length === 2) {
    summaryReason = `The device currently has ${highImpacts[0]} and ${highImpacts[1]}.`;
  } else if (highImpacts.length > 2) {
    const last = highImpacts.pop();
    summaryReason = `The device currently has ${highImpacts.join(', ')}, and ${last}.`;
  } else {
    summaryReason = 'Device resources are operating within healthy baseline conditions.';
  }

  return {
    summaryReason,
    recommendedActions: actions.slice(0, 4), // Top 2-4 recommendations
  };
}
