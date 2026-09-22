import type { Diagnosis, Prediction } from '../types';

interface Props {
  diagnosis: Diagnosis;
  prediction: Prediction;
}

export function HealthScore({ diagnosis, prediction }: Props) {
  const statusColors = {
    ok: 'bg-emerald-600 text-white',
    warning: 'bg-amber-600 text-white',
    critical: 'bg-rose-600 text-white',
    unavailable: 'bg-slate-500 text-white',
  };

  const statusBg = {
    ok: 'border-emerald-200 bg-emerald-50/60',
    warning: 'border-amber-200 bg-amber-50/60',
    critical: 'border-rose-200 bg-rose-50/60',
    unavailable: 'border-slate-200 bg-slate-50/60',
  };

  return (
    <div className={`rounded-xl border p-5 shadow-xs ${statusBg[diagnosis.status]}`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`flex h-16 w-16 items-center justify-center rounded-xl text-2xl font-bold ${statusColors[diagnosis.status]}`}>
            {diagnosis.healthScore}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Device Health Status</h2>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${statusColors[diagnosis.status]}`}>
                {diagnosis.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-600 font-medium">{diagnosis.summary}</p>
          </div>
        </div>

        <div className="rounded-lg bg-white/90 p-3 text-right text-xs border border-slate-200/60 shadow-2xs">
          <div className="text-slate-500 font-medium">30-Minute Projected Score</div>
          <div className="text-sm font-bold text-slate-800 mt-0.5">
            {prediction.predictedHealthScore} / 100
          </div>
          <div className="text-[11px] text-slate-500 capitalize mt-0.5">
            Trend: <strong className="text-slate-700">{prediction.trend}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
