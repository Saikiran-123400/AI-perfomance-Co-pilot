import type { Severity } from '../types';

export function percent(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return 'Unavailable';
  return `${Math.round(value)}%`;
}

export function celsius(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return 'Unavailable';
  return `${value.toFixed(1)}°C`;
}

export function clockTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function minutesToHuman(minutes: number | null): string {
  if (minutes === null || minutes <= 0) return 'Estimating...';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0) {
    return `~${hrs}h ${mins}m remaining`;
  }
  return `~${mins}m remaining`;
}

export function bandFor(
  metric: 'cpu' | 'ram' | 'storage' | 'temperature' | 'battery',
  value: number
): Severity {
  switch (metric) {
    case 'cpu':
      return value >= 88 ? 'critical' : value >= 70 ? 'warning' : 'ok';
    case 'ram':
      return value >= 90 ? 'critical' : value >= 78 ? 'warning' : 'ok';
    case 'storage':
      return value >= 95 ? 'critical' : value >= 85 ? 'warning' : 'ok';
    case 'temperature':
      return value >= 45 ? 'critical' : value >= 40 ? 'warning' : 'ok';
    case 'battery':
      return value <= 12 ? 'critical' : value <= 25 ? 'warning' : 'ok';
    default:
      return 'ok';
  }
}
