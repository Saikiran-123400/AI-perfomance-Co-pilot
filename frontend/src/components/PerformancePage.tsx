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

    const validSamples = history.filter((s) => typeof getValue(s) === 'number');

    const points = history
      .map((sample, idx) => {
        const x = padding + (idx / Math.max(1, history.length - 1)) * (width - padding * 2);
        const rawVal = getValue(sample);
        const val = Math.min(maxVal, Math.max(0, rawVal ?? 0));
        const y = height - padding - (val / maxVal) * (height - padding * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    const currentVal = history.length > 0 ? getValue(history[history.length - 1]) : 0;

    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">{title}</span>
          <span className="text-xs font-bold text-slate-900" style={{ color: colorHex }}>
            {currentVal !== null && currentVal !== undefined ? `${currentVal.toFixed(1)} ${unit}` : 'Unavailable'}
          </span>
        </div>

        <div className="w-full overflow-hidden">
          <svg viewBox={`0 0 ${width} ${height}`} className="h-28 w-full">
            <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#f1f5f9" strokeWidth="1" />
            <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#f1f5f9" strokeWidth="1" />
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e2e8f0" strokeWidth="1" />
            <polyline fill="none" stroke={colorHex} strokeWidth="2" points={points} strokeLinecap="round" />
          </svg>
        </div>
      </div>
    );
  };

  // High load events filtered from history
  const performanceEvents = history.filter(
    (s) => s.cpuUsage >= 70 || s.ramUsage >= 80 || (s.temperature && s.temperature >= 45) || (s.networkLatencyMs && s.networkLatencyMs >= 150)
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-3 gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Historical Device Performance</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Longitudinal trends for CPU, RAM, GPU, Temperature, Battery, and Network latency.
          </p>
        </div>

        <div className="text-right text-xs text-slate-500">
          Last Sample: <strong className="text-slate-800">{clockTime(latest.timestamp)}</strong>
        </div>
      </div>

      {/* Historical Telemetry Charts Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Metric History Curves</h3>
            <p className="text-xs text-slate-500">Continuous telemetry series over active monitoring period</p>
          </div>
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded">
            {history.length} Telemetry Samples
          </span>
        </div>

        {loading || history.length < 2 ? (
          <div className="py-12 text-center text-xs font-medium text-slate-500 rounded-lg border border-dashed border-slate-300 bg-slate-50">
            Collecting telemetry history samples...
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {renderSingleChart('CPU Usage', (s) => s.cpuUsage, '#2563eb', '%', 100)}
            {renderSingleChart('RAM Usage', (s) => s.ramUsage, '#9333ea', '%', 100)}
            {renderSingleChart('GPU Usage', (s) => s.gpuUsage ?? 0, '#059669', '%', 100)}
            {renderSingleChart('Temperature', (s) => s.temperature ?? 0, '#d97706', '°C', 70)}
            {renderSingleChart('Battery Level', (s) => s.batteryLevel ?? 0, '#16a34a', '%', 100)}
            {renderSingleChart('Network Latency', (s) => s.networkLatencyMs ?? 0, '#0284c7', 'ms', 200)}
          </div>
        )}
      </div>

      {/* Performance Events Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 border-b border-slate-100 pb-2">
          Performance Events
        </h3>

        {performanceEvents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                  <th className="py-2 px-3">Timestamp</th>
                  <th className="py-2 px-3">Event Type</th>
                  <th className="py-2 px-3">Details</th>
                  <th className="py-2 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {performanceEvents.slice(-10).map((evt, idx) => {
                  let eventType = 'System Load';
                  let detail = `CPU ${evt.cpuUsage}%, RAM ${evt.ramUsage}%`;
                  if (evt.ramUsage >= 80) {
                    eventType = 'High Memory Pressure';
                  } else if (evt.cpuUsage >= 75) {
                    eventType = 'High CPU Utilization';
                  } else if (evt.networkLatencyMs && evt.networkLatencyMs >= 150) {
                    eventType = 'High Network Latency';
                    detail = `Ping ${Math.round(evt.networkLatencyMs)} ms`;
                  }

                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono text-slate-500">{clockTime(evt.timestamp)}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{eventType}</td>
                      <td className="py-2.5 px-3 text-slate-600">{detail}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                          Warning Event
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-4 text-xs font-medium text-slate-500">
            No high-threshold performance warning events recorded in current telemetry buffer.
          </div>
        )}
      </div>
    </div>
  );
}
