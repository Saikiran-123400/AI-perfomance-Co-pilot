import { telemetryService } from './telemetryService';
import type {
  Diagnosis,
  DiagnosisEngine,
  Issue,
  Severity,
  TelemetrySample,
} from '../types';

const RULES = {
  cpu: { warning: 70, critical: 88 },
  ram: { warning: 78, critical: 90 },
  gpu: { warning: 70, critical: 85 },
  storage: { warning: 85, critical: 95 },
  temperature: { warning: 40, critical: 45 },
  battery: { warning: 25, critical: 12 },
  drain: { warning: 12, critical: 20 },
  latency: { warning: 80, critical: 150 },
};

const average = (values: number[]) =>
  values.reduce((sum, value) => sum + value, 0) / (values.length || 1);

const worst = (severities: Severity[]): Severity =>
  severities.includes('critical')
    ? 'critical'
    : severities.includes('warning')
      ? 'warning'
      : 'ok';

function check(
  value: number,
  thresholds: { warning: number; critical: number },
  direction: 'above' | 'below'
): Severity {
  const over = direction === 'above';
  if (over ? value >= thresholds.critical : value <= thresholds.critical) return 'critical';
  if (over ? value >= thresholds.warning : value <= thresholds.warning) return 'warning';
  return 'ok';
}

/** Rule-based engine. Implement DiagnosisEngine with a model to replace it. */
export const ruleBasedDiagnosisEngine: DiagnosisEngine = {
  name: 'rules-v1',

  diagnose(samples: TelemetrySample[]): Diagnosis {
    const latest = samples[samples.length - 1];
    const window = samples.slice(-10);

    const cpu = average(window.map((s) => s.cpuUsage));
    const ram = average(window.map((s) => s.ramUsage));
    const storage = average(window.map((s) => s.storageUsage ?? 64));
    
    const validTemps = window.map((s) => s.temperature).filter((t): t is number => typeof t === 'number');
    const temperature = validTemps.length > 0 ? average(validTemps) : 35;

    const validGpu = window.map((s) => s.gpuUsage).filter((g): g is number => typeof g === 'number');
    const gpu = validGpu.length > 0 ? average(validGpu) : null;

    const validLatency = window.map((s) => s.networkLatencyMs).filter((l): l is number => typeof l === 'number');
    const latency = validLatency.length > 0 ? average(validLatency) : null;

    const drain = average(window.map((s) => s.batteryDrainRate));
    const battery = latest.batteryLevel;

    const issues: Issue[] = [];
    const add = (severity: Severity, issue: Omit<Issue, 'severity'>) => {
      if (severity !== 'ok') issues.push({ ...issue, severity });
    };

    add(check(cpu, RULES.cpu, 'above'), {
      code: 'CPU_LOAD',
      title: 'Sustained CPU load',
      detail: `CPU has averaged ${cpu.toFixed(0)}% recently.`,
      recommendation: 'Close heavy background workloads or apps waking the processor.',
    });

    add(check(ram, RULES.ram, 'above'), {
      code: 'MEMORY_PRESSURE',
      title: 'Memory pressure',
      detail: `Memory is ${ram.toFixed(0)}% full on average.`,
      recommendation: 'Close high-memory background applications to release RAM.',
    });

    if (gpu !== null) {
      add(check(gpu, RULES.gpu, 'above'), {
        code: 'GPU_LOAD',
        title: 'High GPU utilization',
        detail: `GPU is averaging ${gpu.toFixed(0)}% load.`,
        recommendation: 'Reduce graphics quality or frame rate limit.',
      });
    }

    if (latency !== null) {
      add(check(latency, RULES.latency, 'above'), {
        code: 'NETWORK_LATENCY',
        title: 'High network latency',
        detail: `Network latency is averaging ${latency.toFixed(0)} ms.`,
        recommendation: 'Check network connection or switch to faster Wi-Fi / Ethernet.',
      });
    }

    add(check(storage, RULES.storage, 'above'), {
      code: 'STORAGE_PRESSURE',
      title: 'Storage running high',
      detail: `Storage is ${storage.toFixed(0)}% full.`,
      recommendation: 'Clear cached media files and download data.',
    });

    if (validTemps.length > 0) {
      add(check(temperature, RULES.temperature, 'above'), {
        code: 'THERMAL',
        title: 'Running hot',
        detail: `Temperature is averaging ${temperature.toFixed(1)}°C.`,
        recommendation: 'Reduce CPU/GPU heavy workload and allow device to cool down.',
      });
    }

    if (typeof battery === 'number') {
      add(check(battery, RULES.battery, 'below'), {
        code: 'BATTERY_LOW',
        title: 'Battery running low',
        detail: `Battery is at ${battery.toFixed(0)}%.`,
        recommendation: 'Charge soon, or turn on battery saver.',
      });
    }

    add(check(drain, RULES.drain, 'above'), {
      code: 'BATTERY_DRAIN',
      title: 'Fast battery drain',
      detail: `Losing about ${drain.toFixed(0)}% per hour.`,
      recommendation: 'Lower screen brightness and limit background activity.',
    });

    const healthScore = scoreOf({ cpu, ram, storage, temperature, battery: battery ?? 80, drain });
    const status = worst(issues.map((issue) => issue.severity));

    return {
      timestamp: latest.timestamp,
      healthScore,
      status,
      summary: summarize(status, issues, healthScore),
      issues,
    };
  },
};

/** 0-100. Each metric contributes a weighted penalty. */
function scoreOf(input: {
  cpu: number;
  ram: number;
  storage: number;
  temperature: number;
  battery: number;
  drain: number;
}): number {
  const penalty =
    Math.max(0, input.cpu - 50) * 0.35 +
    Math.max(0, input.ram - 60) * 0.35 +
    Math.max(0, input.storage - 80) * 0.25 +
    Math.max(0, input.temperature - 36) * 2.4 +
    Math.max(0, 30 - input.battery) * 0.4 +
    Math.max(0, input.drain - 9) * 0.9;

  return Math.round(Math.min(100, Math.max(0, 100 - penalty)));
}

function summarize(status: Severity, issues: Issue[], score: number): string {
  if (status === 'ok') return `Everything looks normal. Health score ${score}.`;
  const names = issues.map((issue) => issue.title.toLowerCase()).join(', ');
  const lead = status === 'critical' ? 'Needs attention now' : 'Worth a look';
  return `${lead}: ${names}. Health score ${score}.`;
}

let engine: DiagnosisEngine = ruleBasedDiagnosisEngine;

export function setDiagnosisEngine(next: DiagnosisEngine): void {
  engine = next;
}

export const diagnosisService = {
  current(): Diagnosis {
    const samples = telemetryService.history(30);
    if (samples.length === 0) samples.push(telemetryService.latest());
    return engine.diagnose(samples);
  },
  engineName(): string {
    return engine.name;
  },
};
