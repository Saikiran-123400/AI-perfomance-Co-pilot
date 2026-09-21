/** Shared domain types. Kept free of Express/SQLite so they can be reused. */

export interface ActiveAppItem {
  pid?: number;
  name: string;
  cpuPercent?: number;
  cpuFormatted?: string;
  ramMb?: number;
  ramFormatted?: string;
  startTime?: number | null;
}

export interface InstalledAppItem {
  name: string;
  publisher?: string;
  version?: string;
  installLocation?: string;
  isRunning: boolean;
}

export interface TelemetrySample {
  id?: number;
  /** Unix epoch milliseconds. */
  timestamp: number;
  /** Percent, 0-100. */
  cpuUsage: number;
  /** Percent, 0-100. */
  ramUsage: number;
  ramTotal?: number | null;
  ramUsed?: number | null;
  ramAvailable?: number | null;
  /** Percent, 0-100. */
  storageUsage: number;
  storageTotal?: number | null;
  storageUsed?: number | null;
  storageAvailable?: number | null;
  /** Degrees Celsius, null if unavailable. */
  temperature: number | null;
  /** Percent, 0-100, null if unavailable. */
  batteryLevel: number | null;
  charging?: boolean | null;
  /** Percent per hour, positive while discharging. */
  batteryDrainRate: number;
  /** Data source: "Android Device" vs "Windows PC" vs "Simulator" */
  source?: string;
  /** Platform identifier: "Android Device" | "Windows PC" | "iOS Device" | "Simulated Data" */
  platform?: string;
  /** Real-time active applications running on the device. */
  activeApps?: ActiveAppItem[] | null;
  activeApplications?: ActiveAppItem[] | null;
  /** Real Windows installed applications scanned from registry. */
  installedApps?: InstalledAppItem[] | null;
  installedApplications?: InstalledAppItem[] | null;
}

export type Severity = 'ok' | 'warning' | 'critical';

export interface Issue {
  code: string;
  title: string;
  detail: string;
  severity: Severity;
  recommendation: string;
}

export interface Diagnosis {
  timestamp: number;
  healthScore: number;
  status: Severity;
  summary: string;
  issues: Issue[];
}

export interface Prediction {
  timestamp: number;
  /** Health score expected in `horizonMinutes` minutes. */
  predictedHealthScore: number;
  horizonMinutes: number;
  /** Minutes of battery left, null when it cannot be estimated. */
  batteryMinutesRemaining: number | null;
  trend: 'improving' | 'stable' | 'degrading';
  confidence: number;
  notes: string[];
}

export interface TelemetrySource {
  readonly name: string;
  read(previous?: TelemetrySample): TelemetrySample;
}

export interface DiagnosisEngine {
  readonly name: string;
  diagnose(samples: TelemetrySample[]): Diagnosis;
}

export interface PredictionEngine {
  readonly name: string;
  predict(samples: TelemetrySample[], diagnosis: Diagnosis): Prediction;
}

export interface DashboardData {
  telemetry: {
    latest: TelemetrySample;
    history: TelemetrySample[];
    source: string;
  };
  diagnosis: Diagnosis;
  prediction: Prediction;
}

/** Pre-Installation Prediction Types */

export type ImpactRating = 'LOW' | 'MEDIUM' | 'MEDIUM-HIGH' | 'HIGH' | 'CRITICAL';

export interface AppProfile {
  id: string;
  name: string;
  category: string;
  sizeMB: number;
  ramRequirementMB: number;
  cpuIntensity: 'low' | 'medium' | 'high' | 'extreme';
}

export interface AppImpactAnalysis {
  app: AppProfile;
  overallImpact: ImpactRating;
  ramImpact: ImpactRating;
  cpuImpact: ImpactRating;
  storageImpact: ImpactRating;
  batteryImpact: ImpactRating;
  thermalImpact: ImpactRating;
  explanations: string[];
}

/** Phase 6 & 7 Simulation & Validation Types */

export interface SimulatedActualMetrics {
  ramUsage: number;
  cpuUsage: number;
  batteryLevel: number;
  temperature: number;
  storageUsage: number;
}

export interface MetricComparison {
  metric: 'RAM' | 'CPU' | 'Battery' | 'Thermal' | 'Storage';
  predicted: ImpactRating;
  actualValueFormatted: string;
  actualSeverity: ImpactRating;
  matchRating: 'Exact' | 'Close' | 'Divergent';
}

export interface PlayStoreApp {
  appId: string;
  title: string;
  developer: string | null;
  icon: string | null;
  scoreText: string | null;
  score: number | null;
  installs: string | null;
  size: string | null;
  sizeMB: number | null;
  version: string | null;
  genre: string | null;
  summary: string | null;
  description: string | null;
}

export interface AppSessionAnalysis {
  id?: number;
  appName: string;
  pid?: number;
  startTime: number;
  endTime?: number;
  durationSeconds: number;
  avgCpuPercent: number;
  peakCpuPercent: number;
  avgRamMb: number;
  peakRamMb: number;
  batteryStart: number | null;
  batteryEnd: number | null;
  tempStart: number | null;
  tempEnd: number | null;
  createdAt?: string;
}

export interface SimulationComparison {
  app: AppProfile;
  predicted: AppImpactAnalysis;
  actual: SimulatedActualMetrics;
  predictedOverall: ImpactRating;
  actualOverall: ImpactRating;
  accuracyScore: number;
  metricComparisons: MetricComparison[];
}
