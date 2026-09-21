import type { Diagnosis, TelemetrySample } from '../types';

export type OptimizationSeverity = 'Low' | 'Medium' | 'High';
export type OptimizationStatus = 'Active' | 'Resolved';

export interface OptimizationItem {
  id: string;
  metricKey: 'RAM' | 'CPU' | 'STORAGE' | 'THERMAL' | 'BATTERY' | 'DRAIN';
  severity: OptimizationSeverity;
  title: string;
  problem: string;
  whyItMatters: string;
  recommendedAction: string;
  expectedBenefit: string;
  status: OptimizationStatus;
}

export function generateOptimizations(
  telemetry: TelemetrySample,
  diagnosis?: Diagnosis,
  resolvedIds: Set<string> = new Set()
): OptimizationItem[] {
  const items: OptimizationItem[] = [];

  const ramUsage = telemetry.ramUsage;
  const cpuUsage = telemetry.cpuUsage;
  const storageUsage = telemetry.storageUsage ?? 64;
  const temp = telemetry.temperature;
  const battery = telemetry.batteryLevel;
  const drain = telemetry.batteryDrainRate ?? 8;

  // 1. RAM Pressure Optimization
  if (ramUsage >= 80) {
    const id = 'opt-ram-high';
    items.push({
      id,
      metricKey: 'RAM',
      severity: 'High',
      title: 'Critical Memory Pressure',
      problem: `RAM usage is currently ${ramUsage.toFixed(0)}%. System RAM is nearly exhausted.`,
      whyItMatters: 'High memory pressure forces background apps to crash, causes input stuttering, and leads to system-wide lag.',
      recommendedAction: 'Close high-memory background applications and restart browser tabs or media editors.',
      expectedBenefit: 'Frees physical memory, restores smooth UI responsiveness, and prevents app force-closes.',
      status: resolvedIds.has(id) ? 'Resolved' : 'Active',
    });
  } else if (ramUsage >= 65) {
    const id = 'opt-ram-med';
    items.push({
      id,
      metricKey: 'RAM',
      severity: 'Medium',
      title: 'Moderate Memory Usage',
      problem: `RAM usage is currently ${ramUsage.toFixed(0)}%. Available headroom is limited.`,
      whyItMatters: 'Multitasking with heavy apps may cause slower app switching times.',
      recommendedAction: 'Close idle background apps that you are not actively using.',
      expectedBenefit: 'Reclaims RAM headroom and ensures quick app switching.',
      status: resolvedIds.has(id) ? 'Resolved' : 'Active',
    });
  }

  // 2. High CPU Usage Optimization
  if (cpuUsage >= 75) {
    const id = 'opt-cpu-high';
    items.push({
      id,
      metricKey: 'CPU',
      severity: 'High',
      title: 'Sustained High CPU Load',
      problem: `CPU usage is currently ${cpuUsage.toFixed(0)}%. Processor is running near maximum capacity.`,
      whyItMatters: 'Continuous high CPU load causes severe thermal generation, rapid battery drain, and UI stutter.',
      recommendedAction: 'Identify and exit processor-heavy background tasks, cloud syncs, or active games.',
      expectedBenefit: 'Reduces processor load, cools down internal components, and extends battery runtime.',
      status: resolvedIds.has(id) ? 'Resolved' : 'Active',
    });
  } else if (cpuUsage >= 50) {
    const id = 'opt-cpu-med';
    items.push({
      id,
      metricKey: 'CPU',
      severity: 'Medium',
      title: 'Elevated CPU Activity',
      problem: `CPU usage is currently ${cpuUsage.toFixed(0)}%. Background processes are consuming power.`,
      whyItMatters: 'Elevated processor usage gradually increases battery drain and internal temperature.',
      recommendedAction: 'Pause active downloads or background rendering tasks.',
      expectedBenefit: 'Lowers CPU load to baseline and conserves system energy.',
      status: resolvedIds.has(id) ? 'Resolved' : 'Active',
    });
  }

  // 3. Low Storage Optimization
  if (storageUsage >= 85) {
    const id = 'opt-storage-high';
    items.push({
      id,
      metricKey: 'STORAGE',
      severity: 'High',
      title: 'Storage Capacity Critical',
      problem: `Storage is ${storageUsage.toFixed(0)}% full (${(((100 - storageUsage) / 100) * 128).toFixed(1)} GB free).`,
      whyItMatters: 'Low storage limits OS swap file creation, prevents app updates, and degrades write speeds.',
      recommendedAction: 'Delete temporary download files, clear app cache, and remove unused offline media.',
      expectedBenefit: 'Restores essential swap disk space and prevents file save failures.',
      status: resolvedIds.has(id) ? 'Resolved' : 'Active',
    });
  } else if (storageUsage >= 70) {
    const id = 'opt-storage-med';
    items.push({
      id,
      metricKey: 'STORAGE',
      severity: 'Medium',
      title: 'Storage Space Getting Low',
      problem: `Storage is ${storageUsage.toFixed(0)}% full.`,
      whyItMatters: 'Accumulating temp files may gradually slow down drive performance.',
      recommendedAction: 'Clear cached app data and empty the trash/downloads folder.',
      expectedBenefit: 'Reclaims storage buffer for new photos and app updates.',
      status: resolvedIds.has(id) ? 'Resolved' : 'Active',
    });
  }

  // 4. High Temperature Optimization
  if (temp !== null) {
    if (temp >= 42) {
      const id = 'opt-temp-high';
      items.push({
        id,
        metricKey: 'THERMAL',
        severity: 'High',
        title: 'Device Thermal Overheating',
        problem: `Internal device temperature has reached ${temp.toFixed(1)}°C.`,
        whyItMatters: 'High heat triggers automatic CPU thermal throttling, reduces charging speed, and degrades battery lifespan.',
        recommendedAction: 'Disconnect charger, close intense 3D apps, and move device out of direct sunlight or hot environments.',
        expectedBenefit: 'Cools down device safely and protects battery health.',
        status: resolvedIds.has(id) ? 'Resolved' : 'Active',
      });
    } else if (temp >= 38) {
      const id = 'opt-temp-med';
      items.push({
        id,
        metricKey: 'THERMAL',
        severity: 'Medium',
        title: 'Elevated Temperature',
        problem: `Internal device temperature is ${temp.toFixed(1)}°C.`,
        whyItMatters: 'Warm operating temperature speeds up battery drain and increases fan/processor load.',
        recommendedAction: 'Pause heavy gaming or high-resolution video streaming for a few minutes.',
        expectedBenefit: 'Allows internal components to return to nominal operating temperature.',
        status: resolvedIds.has(id) ? 'Resolved' : 'Active',
      });
    }
  }

  // 5. Low Battery Optimization
  if (battery !== null && battery <= 20) {
    const id = 'opt-battery-low';
    items.push({
      id,
      metricKey: 'BATTERY',
      severity: 'High',
      title: 'Battery Critical',
      problem: `Battery level is at ${battery.toFixed(0)}%. Shutdown is imminent.`,
      whyItMatters: 'Risk of abrupt device shutdown and unsaved work or data loss.',
      recommendedAction: 'Plug in charger immediately or enable OS Low Power Mode.',
      expectedBenefit: 'Prevents device shutdown and maintains active session continuity.',
      status: resolvedIds.has(id) ? 'Resolved' : 'Active',
    });
  }

  // 6. Fast Battery Drain Optimization
  if (drain >= 15) {
    const id = 'opt-drain-high';
    items.push({
      id,
      metricKey: 'DRAIN',
      severity: 'High',
      title: 'Rapid Battery Discharge Rate',
      problem: `Battery is discharging at ~${drain.toFixed(0)}% per hour.`,
      whyItMatters: 'Unusual power draw drastically reduces remaining battery operating hours.',
      recommendedAction: 'Reduce display brightness, disable unused GPS/location services, and turn off 5G/Bluetooth scanning.',
      expectedBenefit: 'Significantly extends remaining battery time per charge.',
      status: resolvedIds.has(id) ? 'Resolved' : 'Active',
    });
  }

  return items;
}
