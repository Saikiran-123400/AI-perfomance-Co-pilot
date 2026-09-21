import { useEffect, useState } from 'react';
import type { TelemetrySample } from '../types';
import { apiClient } from '../services/apiClient';
import { clockTime } from '../services/formatters';

interface Props {
  currentTelemetry: TelemetrySample;
}

export function PerformancePage({ currentTelemetry }: Props) {
  const [history, setHistory] = useState<TelemetrySample[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    apiClient
      .getTelemetryHistory(50)
      .then((data) => {
        if (mounted) {
          setHistory(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    const interval = setInterval(() => {
      apiClient.getTelemetryHistory(50).then((data) => {
        if (mounted && data.length > 0) {
          setHistory(data);
        }
      });
    }, 4000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const latest = history.length > 0 ? history[history.length - 1] : currentTelemetry;
  const sourceName = latest.platform || latest.source || 'Simulated Data';

  // Single metric SVG line chart renderer
  const renderSingleChart = (
    title: string,
    getValue: (s: TelemetrySample) => number,
    colorHex: string,
    unit: string,
    maxVal = 100
  ) => {
    const width = 500;
    const height = 120;
    const padding = 15;

    const points = history
      .map((sample, idx) => {
        const x = padding + (idx / Math.max(1, history.length - 1)) * (width - padding * 2);
        const val = Math.min(maxVal, Math.max(0, getValue(sample)));
        const y = height - padding - (val / maxVal) * (height - padding * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    const currentVal = history.length > 0 ? getValue(history[history.length - 1]) : 0;

    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">{title} History</span>
          <span className="text-xs font-extrabold text-slate-900" style={{ color: colorHex }}>
            {currentVal.toFixed(1)}{unit}
          </span>
        </div>

        <div className="w-full overflow-hidden">
          <svg viewBox={`0 0 ${width} ${height}`} className="h-28 w-full">
            <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#f1f5f9" strokeWidth="1" />
            <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#f1f5f9" strokeWidth="1" />
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e2e8f0" strokeWidth="1" />
            <polyline fill="none" stroke={colorHex} strokeWidth="2.5" points={points} strokeLinecap="round" />
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Performance Header */}
      <div className="flex flex-wrap items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Performance Over Time</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Historical CPU, RAM, Battery and Temperature metric trends captured from your device.
          </p>
        </div>

        <div className="text-right text-xs text-slate-500 font-medium">
          Last Update: <strong className="text-slate-800">{clockTime(latest.timestamp)}</strong>
        </div>
      </div>

      {/* Historical Telemetry Charts Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Historical Metric Trends</h3>
            <p className="text-xs text-slate-500">Historical telemetry trends captured directly from your device.</p>
          </div>
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded">
            {history.length} Telemetry Samples
          </span>
        </div>

        {loading || history.length < 2 ? (
          <div className="py-12 text-center text-slate-500 rounded-lg border border-dashed border-slate-300 bg-slate-50">
            <span className="text-2xl block mb-2">⏳</span>
            <p className="font-semibold text-sm text-slate-700">Collecting performance data...</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {renderSingleChart('CPU Usage', (s) => s.cpuUsage, '#3b82f6', '%', 100)}
            {renderSingleChart('RAM Usage', (s) => s.ramUsage, '#a855f7', '%', 100)}
            {renderSingleChart('Battery Level', (s) => s.batteryLevel ?? 0, '#10b981', '%', 100)}
            {renderSingleChart('Temperature', (s) => s.temperature ?? 0, '#f59e0b', '°C', 60)}
          </div>
        )}
      </div>
    </div>
  );
}
