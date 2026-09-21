import type { AppImpactAnalysis, AppProfile, ImpactRating, TelemetrySample, PlayStoreApp } from '../types';

export const SAMPLE_APPS: AppProfile[] = [
  {
    id: 'bgmi',
    name: 'BGMI (Battlegrounds Mobile India)',
    category: 'Action Gaming',
    sizeMB: 3200,
    ramRequirementMB: 3000,
    cpuIntensity: 'high',
  },
  {
    id: 'genshin',
    name: 'Genshin Impact',
    category: '3D Open World RPG',
    sizeMB: 18500,
    ramRequirementMB: 4500,
    cpuIntensity: 'extreme',
  },
  {
    id: 'lightroom',
    name: 'Adobe Lightroom Mobile',
    category: 'Photo & Video Editing',
    sizeMB: 1400,
    ramRequirementMB: 2200,
    cpuIntensity: 'high',
  },
  {
    id: 'spotify',
    name: 'Spotify',
    category: 'Music & Audio',
    sizeMB: 220,
    ramRequirementMB: 450,
    cpuIntensity: 'low',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Messenger',
    category: 'Communication',
    sizeMB: 150,
    ramRequirementMB: 350,
    cpuIntensity: 'low',
  },
];

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

export function analyzeAppImpact(app: AppProfile, sample: TelemetrySample): AppImpactAnalysis {
  const TOTAL_RAM_MB = 8192; // Assume 8 GB device total
  const TOTAL_STORAGE_GB = 128; // Assume 128 GB device total

  const explanations: string[] = [];

  // 1. RAM Impact
  const currentRamMB = (sample.ramUsage / 100) * TOTAL_RAM_MB;
  const projectedRamMB = currentRamMB + app.ramRequirementMB;
  const projectedRamPercent = (projectedRamMB / TOTAL_RAM_MB) * 100;

  let ramImpact: ImpactRating = 'LOW';
  if (projectedRamPercent >= 95) {
    ramImpact = 'CRITICAL';
    explanations.push(
      `RAM pressure critical (${(currentRamMB / 1024).toFixed(1)}/8.0 GB currently used). Adding ${app.name} (${(app.ramRequirementMB / 1024).toFixed(1)} GB RAM) will likely trigger app crashes.`
    );
  } else if (projectedRamPercent >= 84) {
    ramImpact = 'HIGH';
    explanations.push(
      `High RAM demand (${(currentRamMB / 1024).toFixed(1)}/8.0 GB used). ${app.name} requires ${(app.ramRequirementMB / 1024).toFixed(1)} GB RAM, causing aggressive background app killing.`
    );
  } else if (projectedRamPercent >= 72) {
    ramImpact = 'MEDIUM-HIGH';
    explanations.push(
      `Moderate-high RAM load expected (~${projectedRamPercent.toFixed(0)}% total allocation).`
    );
  } else if (projectedRamPercent >= 60) {
    ramImpact = 'MEDIUM';
  }

  // 2. CPU Impact
  const cpuIntensityValues = { low: 15, medium: 35, high: 65, extreme: 90 };
  const appCpu = cpuIntensityValues[app.cpuIntensity];
  const projectedCpu = sample.cpuUsage + appCpu * 0.35;

  let cpuImpact: ImpactRating = 'LOW';
  if (projectedCpu >= 90 || (sample.cpuUsage > 60 && app.cpuIntensity === 'extreme')) {
    cpuImpact = 'CRITICAL';
    explanations.push(
      `CPU will be severely bottlenecked. Current CPU usage is ${sample.cpuUsage.toFixed(0)}% and ${app.name} demands ${app.cpuIntensity.toUpperCase()} processor output.`
    );
  } else if (projectedCpu >= 75 || app.cpuIntensity === 'high') {
    cpuImpact = 'HIGH';
    explanations.push(
      `Sustained heavy CPU load expected. ${app.name} requires intense thread processing.`
    );
  } else if (projectedCpu >= 55 || app.cpuIntensity === 'medium') {
    cpuImpact = 'MEDIUM-HIGH';
  } else if (projectedCpu >= 40) {
    cpuImpact = 'MEDIUM';
  }

  // 3. Storage Impact
  const currentUsedStorageGB = (sample.storageUsage / 100) * TOTAL_STORAGE_GB;
  const currentFreeStorageGB = TOTAL_STORAGE_GB - currentUsedStorageGB;
  const appSizeGB = app.sizeMB / 1024;
  const projectedFreeStorageGB = currentFreeStorageGB - appSizeGB;

  let storageImpact: ImpactRating = 'LOW';
  if (projectedFreeStorageGB <= 2) {
    storageImpact = 'CRITICAL';
    explanations.push(
      `Storage limit reached! Only ${currentFreeStorageGB.toFixed(1)} GB free storage remaining; installing ${app.name} (${appSizeGB.toFixed(1)} GB) will fill device memory.`
    );
  } else if (projectedFreeStorageGB <= 8 || appSizeGB >= 15) {
    storageImpact = 'HIGH';
    explanations.push(
      `Large app footprint (${appSizeGB.toFixed(1)} GB). Device will have only ${projectedFreeStorageGB.toFixed(1)} GB free storage remaining.`
    );
  } else if (appSizeGB >= 3 || sample.storageUsage >= 75) {
    storageImpact = 'MEDIUM-HIGH';
    explanations.push(
      `Moderate storage allocation (${appSizeGB.toFixed(1)} GB required).`
    );
  } else if (appSizeGB >= 1) {
    storageImpact = 'MEDIUM';
  }

  // 4. Thermal Impact
  const currentTemp = sample.temperature ?? 35;
  const thermalAdded = app.cpuIntensity === 'extreme' ? 7 : app.cpuIntensity === 'high' ? 4 : app.cpuIntensity === 'medium' ? 2 : 0.5;
  const projectedTemp = currentTemp + thermalAdded;

  let thermalImpact: ImpactRating = 'LOW';
  if (projectedTemp >= 45 || (currentTemp >= 40 && (app.cpuIntensity === 'high' || app.cpuIntensity === 'extreme'))) {
    thermalImpact = 'HIGH';
    if (currentTemp >= 38) {
      explanations.push(
        `Thermal throttling warning! Phone is currently warm at ${currentTemp.toFixed(1)}°C. Running ${app.name} will raise heat quickly.`
      );
    } else {
      explanations.push(
        `High thermal output projected (~${projectedTemp.toFixed(1)}°C).`
      );
    }
  } else if (projectedTemp >= 41 || app.cpuIntensity === 'extreme') {
    thermalImpact = 'MEDIUM-HIGH';
  } else if (projectedTemp >= 36) {
    thermalImpact = 'MEDIUM';
  }

  // 5. Battery Impact
  const currentBattery = sample.batteryLevel ?? 80;
  const batteryDrainAdded = app.cpuIntensity === 'extreme' ? 18 : app.cpuIntensity === 'high' ? 12 : app.cpuIntensity === 'medium' ? 6 : 2;
  const projectedDrainRate = sample.batteryDrainRate + batteryDrainAdded;

  let batteryImpact: ImpactRating = 'LOW';
  if (currentBattery <= 25 && (app.cpuIntensity === 'high' || app.cpuIntensity === 'extreme')) {
    batteryImpact = 'CRITICAL';
    explanations.push(
      `Low battery warning (${currentBattery}% remaining). High-power app will discharge battery in less than 45 minutes.`
    );
  } else if (currentBattery <= 40 && app.cpuIntensity !== 'low') {
    batteryImpact = 'HIGH';
    explanations.push(
      `Accelerated battery drain. Estimated drain rate ~${projectedDrainRate.toFixed(0)}%/hr with battery at ${currentBattery}%.`
    );
  } else if (projectedDrainRate >= 18) {
    batteryImpact = 'MEDIUM-HIGH';
  } else if (projectedDrainRate >= 10) {
    batteryImpact = 'MEDIUM';
  }

  if (explanations.length === 0) {
    explanations.push(`Device metrics are healthy. ${app.name} can run smoothly with minimal system stress.`);
  }

  const overallImpact = maxImpact(ramImpact, cpuImpact, storageImpact, thermalImpact, batteryImpact);

  return {
    app,
    overallImpact,
    ramImpact,
    cpuImpact,
    storageImpact,
    batteryImpact,
    thermalImpact,
    explanations,
  };
}

export function analyzePlayStoreAppImpact(playApp: PlayStoreApp, sample: TelemetrySample): AppImpactAnalysis {
  const genreLower = (playApp.genre || '').toLowerCase();
  const titleLower = (playApp.title || '').toLowerCase();
  const summaryLower = (playApp.summary || '').toLowerCase() + ' ' + (playApp.description || '').toLowerCase();

  let cpuIntensity: 'low' | 'medium' | 'high' | 'extreme' = 'medium';

  if (
    genreLower.includes('action') ||
    genreLower.includes('rpg') ||
    genreLower.includes('racing') ||
    titleLower.includes('genshin') ||
    titleLower.includes('pubg') ||
    titleLower.includes('bgmi') ||
    titleLower.includes('call of duty') ||
    summaryLower.includes('3d graphics') ||
    summaryLower.includes('unreal engine')
  ) {
    cpuIntensity = 'high';
    if (titleLower.includes('genshin') || summaryLower.includes('open world 3d')) {
      cpuIntensity = 'extreme';
    }
  } else if (
    genreLower.includes('game') ||
    genreLower.includes('simulation') ||
    genreLower.includes('arcade') ||
    genreLower.includes('editing') ||
    genreLower.includes('video')
  ) {
    cpuIntensity = 'medium';
  } else if (
    genreLower.includes('social') ||
    genreLower.includes('communication') ||
    genreLower.includes('music') ||
    genreLower.includes('productivity') ||
    genreLower.includes('books') ||
    genreLower.includes('education') ||
    genreLower.includes('finance')
  ) {
    cpuIntensity = 'low';
  }

  const appSizeMB = playApp.sizeMB ?? 150;
  const ramReqMB = cpuIntensity === 'extreme' ? 4000 : cpuIntensity === 'high' ? 2500 : cpuIntensity === 'medium' ? 1200 : 500;

  const appProfile: AppProfile = {
    id: playApp.appId,
    name: playApp.title,
    category: playApp.genre || 'Play Store App',
    sizeMB: appSizeMB,
    ramRequirementMB: ramReqMB,
    cpuIntensity,
  };

  return analyzeAppImpact(appProfile, sample);
}

