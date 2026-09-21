import type { Diagnosis, Prediction } from '../types';

interface Props {
  diagnosis: Diagnosis;
  prediction: Prediction;
}

export function HealthScore({ diagnosis, prediction }: Props) {
  const statusColors = {
    ok: 'bg-emerald-500 text-white',
    warning: 'bg-amber-500 text-white',
    critical: 'bg-rose-500 text-white',
  };

  const statusBg = {
    ok: 'border-emerald-200 bg-emerald-50/50',
    warning: 'border-amber-200 bg-amber-50/50',
    critical: 'border-rose-200 bg-rose-50/50',
  };

  return (
    <div className={`rounded-xl border p-5 shadow-sm transition-all ${statusBg[diagnosis.status]}`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold shadow-sm ${statusColors[diagnosis.status]}`}>
            {diagnosis.healthScore}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">Health Score</h2>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${statusColors[diagnosis.status]}`}>
                {diagnosis.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600">{diagnosis.summary}</p>
          </div>
        </div>

        <div className="rounded-lg bg-white/80 p-3 text-right text-xs shadow-xs">
          <div className="text-slate-500">30-Min Outlook</div>
          <div className="text-sm font-semibold text-slate-800">
            {prediction.predictedHealthScore} pts ({prediction.trend})
          </div>
          <div className="text-slate-400">Confidence: {(prediction.confidence * 100).toFixed(0)}%</div>
        </div>
      </div>
    </div>
  );
}
