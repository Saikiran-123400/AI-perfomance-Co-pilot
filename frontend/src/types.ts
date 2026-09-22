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
  cpuTemp?: number | null;
  /** Percent, 0-100, null if unavailable. */
  gpuUsage?: number | null;
  gpuVramTotal?: number | null;
  gpuVramUsed?: number | null;
  gpuTemp?: number | null;
  /** Network telemetry. */
  networkLatencyMs?: number | null;
  packetLossPercent?: number | null;
  downloadKbps?: number | null;
  uploadKbps?: number | null;
  /** Percent, 0-100, null if unavailable. */
  batteryLevel: number | null;
  charging?: boolean | null;
  chargingStatus?: string | null;
  batteryTimeRemainingMinutes?: number | null;
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

export type Severity = 'ok' | 'warning' | 'critical' | 'unavailable';

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

export interface CopilotResponse {
  question: string;
  answer?: string;
  explanation: string;
  evidence: string[];
  recommendations?: string[];
  recommendation: string;
  severity?: 'ok' | 'warning' | 'critical' | 'unavailable';
  timestamp: number;
}

/** File Intelligence Domain Types */

export interface StorageCategoryDistribution {
  category: 'Applications' | 'Documents' | 'Images' | 'Videos' | 'Downloads' | 'Projects/Development' | 'Archives' | 'Other';
  bytes: number;
  formattedSize: string;
  fileCount: number;
  percent: number;
}

export interface StorageOverview {
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
  usagePercent: number;
  totalFormatted: string;
  freeFormatted: string;
  usedFormatted: string;
  categories: StorageCategoryDistribution[];
}

export interface DeclutterSummary {
  duplicateBytes: number;
  duplicateFormatted: string;
  installersBytes: number;
  installersFormatted: string;
  devArtifactsBytes: number;
  devArtifactsFormatted: string;
  largeUnusedBytes: number;
  largeUnusedFormatted: string;
  tempFilesBytes: number;
  tempFilesFormatted: string;
  totalReclaimableBytes: number;
  totalReclaimableFormatted: string;
}

export interface FileItemInfo {
  name: string;
  path: string;
  size: number;
  formattedSize: string;
  modifiedDate: number;
  modifiedFormatted: string;
  category: string;
  extension: string;
}

export interface DuplicateGroup {
  groupId: string;
  hash: string;
  size: number;
  formattedSize: string;
  recoverableBytes: number;
  recoverableFormatted: string;
  files: FileItemInfo[];
  isPossibleDuplicate?: boolean;
}

export interface RedundantItem {
  id: string;
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  formattedSize: string;
  category: 'Dev Artifact' | 'Old Installer' | 'Temporary File' | 'Old Archive' | 'Crash/Log File';
  projectName?: string;
  reason: string;
}

export interface DevProjectCleanup {
  projectName: string;
  projectPath: string;
  sourceBytes: number;
  sourceFormatted: string;
  generatedBytes: number;
  generatedFormatted: string;
  rebuildableBytes: number;
  rebuildableFormatted: string;
  artifacts: RedundantItem[];
}

export interface SmartOrganizationPreview {
  id: string;
  fileName: string;
  currentPath: string;
  suggestedPath: string;
  suggestedCategory: string;
  size: number;
  formattedSize: string;
}

export interface SensitiveFileItem {
  id: string;
  name: string;
  path: string;
  size: number;
  formattedSize: string;
  modifiedFormatted: string;
  reason: string;
}

export interface StorageSnapshot {
  date: string;
  timestamp: number;
  usedGb: number;
}

export interface StorageGrowthData {
  history: StorageSnapshot[];
  weeklyGrowthGb: number;
  pressureLevel: 'normal' | 'moderate' | 'high';
  pressureMessage: string;
}

/** Discover Page Domain Types */

export interface DiscoverVideoItem {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  publishedAt?: string;
  duration?: string;
  url: string;
  topic: string;
}

export interface SoftwareUpdateItem {
  id: string;
  name: string;
  installedVersion: string;
  latestVersion: string;
  status: 'Update available' | 'Up to date';
  officialUrl: string;
  publisher?: string;
}

export interface HardwareRecommendationItem {
  id: string;
  component: 'RAM' | 'Storage' | 'Cooling' | 'GPU' | 'System';
  title: string;
  reason: string;
  recommendation: string;
  urgency: 'low' | 'medium' | 'high';
  url?: string;
}

export interface LearningResourceItem {
  id: string;
  title: string;
  category: string;
  description: string;
  source: string;
  url: string;
  actionText: string;
}

export interface PerformanceResourceItem {
  id: string;
  title: string;
  detectedCondition: string;
  description: string;
  source: string;
  url: string;
}

export interface DiscoverPayload {
  personalizedSummary: string;
  activeContextSummary: {
    activeApps: string[];
    detectedStack: string;
    cpuPercent: number;
    ramPercent: number;
    temperatureC: number | null;
  };
  youtubeState: {
    available: boolean;
    message?: string;
    videos: DiscoverVideoItem[];
  };
  softwareUpdates: SoftwareUpdateItem[];
  hardwareRecommendations: HardwareRecommendationItem[];
  learningResources: LearningResourceItem[];
  performanceResources: PerformanceResourceItem[];
  timestamp: number;
}
export type AdaptiveContextType =
  | 'Development'
  | 'Gaming'
  | 'Study'
  | 'College'
  | 'Travel'
  | 'Reading'
  | 'Sleep'
  | 'General';

export interface AdaptiveDayRecommendation {
  id: string;
  title: string;
  description: string;
  actionText: string;
  actionType: 'focus' | 'battery' | 'gpu' | 'display' | 'general';
  isApplied: boolean;
  isAvailableOnDevice: boolean;
}

export interface AdaptiveDayContext {
  contextType: AdaptiveContextType;
  confidencePercent: number;
  patternState: 'Recurring pattern detected' | 'Still learning your routine';
  repetitionCount: number;
  evidence: string[];
  predictedNextContext: string;
  predictedTimeRemainingMinutes: number;
  recommendations: AdaptiveDayRecommendation[];
}

export interface AdaptiveDayPreferences {
  isPaused: boolean;
  locationPermissionEnabled: boolean;
  actionMode: 'Ask before applying changes' | 'Automatic';
  dismissedContexts: string[];
}

export interface AdaptiveDayEvent {
  id: number;
  contextType: string;
  confidenceLevel: number;
  evidence: string[];
  predictedNext?: string;
  recommendations?: string[];
  actionApplied?: string;
  dismissed: boolean;
  createdAt: string;
}

export interface AdaptiveDayState {
  currentContext: AdaptiveDayContext;
  preferences: AdaptiveDayPreferences;
  recentEvents: AdaptiveDayEvent[];
  timestamp: number;
}
