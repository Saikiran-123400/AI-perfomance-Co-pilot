import type { Diagnosis, Prediction } from '../types';

interface Props {
  diagnosis: Diagnosis;
  prediction: Prediction;
}

export function IssueList({ diagnosis }: Props) {
  const topIssue = diagnosis.issues.length > 0 ? diagnosis.issues[0] : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
        Current Warning & Recommendation
      </h3>
      {topIssue ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">{topIssue.title}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                topIssue.severity === 'critical'
                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                  : topIssue.severity === 'warning'
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}
            >
              {topIssue.severity}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-slate-600">{topIssue.detail}</p>
          <p className="mt-1.5 text-xs font-semibold text-indigo-700">💡 {topIssue.recommendation}</p>
        </div>
      ) : (
        <p className="text-xs text-slate-600 font-medium">
          ✅ No current system issues detected. All core metrics operating within optimal ranges.
        </p>
      )}
    </div>
  );
}
