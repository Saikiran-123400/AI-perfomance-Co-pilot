import type { TelemetrySample } from '../types';

interface Props {
  history: TelemetrySample[];
}

export function TelemetryChart({ history }: Props) {
  if (!history || history.length === 0) return null;

  const width = 600;
  const height = 180;
  const padding = 20;

  const getPoints = (getValue: (s: TelemetrySample) => number, maxVal = 100) => {
    return history
      .map((sample, idx) => {
        const x = padding + (idx / Math.max(1, history.length - 1)) * (width - padding * 2);
        const y = height - padding - (getValue(sample) / maxVal) * (height - padding * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const cpuPoints = getPoints((s) => s.cpuUsage, 100);
  const ramPoints = getPoints((s) => s.ramUsage, 100);
  const tempPoints = getPoints((s) => s.temperature ?? 0, 60);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">Telemetry History</h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            <span className="text-slate-600">CPU (%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
            <span className="text-slate-600">RAM (%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-600">Temp (°C)</span>
          </div>
        </div>
      </div>

      <div className="w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full">
          {/* Background grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#f1f5f9" strokeWidth="1" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#f1f5f9" strokeWidth="1" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e2e8f0" strokeWidth="1" />

          {/* Polyline for CPU */}
          <polyline fill="none" stroke="#3b82f6" strokeWidth="2" points={cpuPoints} />
          {/* Polyline for RAM */}
          <polyline fill="none" stroke="#a855f7" strokeWidth="2" points={ramPoints} />
          {/* Polyline for Temp */}
          <polyline fill="none" stroke="#f59e0b" strokeWidth="2" points={tempPoints} />
        </svg>
      </div>
    </div>
  );
}
