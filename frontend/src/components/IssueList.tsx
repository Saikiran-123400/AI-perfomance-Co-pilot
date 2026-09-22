import type { Diagnosis, Prediction } from '../types';

interface Props {
  diagnosis: Diagnosis;
  prediction: Prediction;
}

export function IssueList({ diagnosis }: Props) {
  const topIssue = diagnosis.issues.length > 0 ? diagnosis.issues[0] : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">
        System Analysis & Recommendation
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
          <p className="mt-1 text-xs text-slate-600">{topIssue.detail}</p>
          <div className="mt-2 text-xs font-medium text-slate-800 border-t border-slate-200/80 pt-2">
            <strong className="text-slate-900">Recommendation: </strong>
            {topIssue.recommendation}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 font-medium">
          No current system bottlenecks detected. Hardware metrics operating within optimal parameters.
        </div>
      )}
    </div>
  );
}
