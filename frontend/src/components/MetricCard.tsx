import type { Severity } from '../types';

interface MetricCardProps {
  label: string;
  value: string;
  fill: number;
  severity: Severity;
  note?: string;
}

export function MetricCard({ label, value, fill, severity, note }: MetricCardProps) {
  const severityColors = {
    ok: 'bg-emerald-500',
    warning: 'bg-amber-500',
    critical: 'bg-rose-500',
  };

  const badgeColors = {
    ok: 'text-emerald-700 bg-emerald-100',
    warning: 'text-amber-700 bg-amber-100',
    critical: 'text-rose-700 bg-rose-100',
  };

  const clampedFill = Math.min(100, Math.max(0, fill));

  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${badgeColors[severity]}`}>
            {severity}
          </span>
        </div>
        <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
      </div>

      <div className="mt-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full transition-all duration-500 ${severityColors[severity]}`}
            style={{ width: `${clampedFill}%` }}
          />
        </div>
        {note ? <p className="mt-1.5 text-xs text-slate-500">{note}</p> : null}
      </div>
    </div>
  );
}
