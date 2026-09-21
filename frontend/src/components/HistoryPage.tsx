import { useEffect, useState } from 'react';
import type { ImpactRating } from '../types';

interface SimulatedRunRecord {
  id: number;
  appName: string;
  predictedRam: ImpactRating;
  actualRam: number;
  predictedCpu: ImpactRating;
  actualCpu: number;
  predictedBattery: ImpactRating;
  actualBattery: number;
  predictedThermal: ImpactRating;
  actualThermal: number;
  predictedStorage: ImpactRating;
  actualStorage: number;
  predictedOverall: ImpactRating;
  actualOverall: ImpactRating;
  accuracyScore: number;
  createdAt: string;
}

export function HistoryPage() {
  const [runs, setRuns] = useState<SimulatedRunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    fetch('http://localhost:4000/api/simulated-runs')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch validation history');
        return res.json();
      })
      .then((data: SimulatedRunRecord[]) => {
        setRuns(data);
      })
      .catch(() => {
        setRuns([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const impactBadgeColor = (impact: ImpactRating) => {
    switch (impact) {
      case 'LOW':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'MEDIUM-HIGH':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'CRITICAL':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const overallBadgeBg = (impact: ImpactRating) => {
    switch (impact) {
      case 'LOW':
        return 'bg-emerald-500 text-white';
      case 'MEDIUM':
        return 'bg-blue-500 text-white';
      case 'MEDIUM-HIGH':
        return 'bg-amber-500 text-white';
      case 'HIGH':
        return 'bg-orange-500 text-white';
      case 'CRITICAL':
        return 'bg-rose-500 text-white';
      default:
        return 'bg-slate-500 text-white';
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return isoString;
    }
  };

  const formatFreeStorage = (usagePercent: number) => `${(100 - usagePercent).toFixed(0)}% free`;

  return (
    <div className="flex flex-col gap-4">
      {/* Top Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Validation & Prediction History</h2>
        <p className="mt-1 text-xs text-slate-500">
          Historical log of Prediction vs Simulated Actual Validation runs stored in SQLite database.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {loading ? (
          <p className="py-6 text-center text-xs text-slate-500">Loading validation history…</p>
        ) : runs.length === 0 ? (
          <div className="py-10 text-center">
            <div className="text-2xl mb-1">📜</div>
            <p className="text-xs font-semibold text-slate-700">No Validation Runs Recorded Yet</p>
            <p className="mt-1 text-[11px] text-slate-400">
              Run an impact analysis & click "Simulate App Run" on the App Analyzer page to record entries.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-3">App Name</th>
                  <th className="py-2.5 px-3">Predicted Impact</th>
                  <th className="py-2.5 px-3">Actual Impact</th>
                  <th className="py-2.5 px-3">Simulation Accuracy</th>
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {runs.map((item) => {
                  const isExpanded = expandedId === item.id;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-900">{item.appName}</td>
                      <td className="py-3 px-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${overallBadgeBg(item.predictedOverall)}`}>
                          {item.predictedOverall}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${overallBadgeBg(item.actualOverall)}`}>
                          {item.actualOverall}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          {item.accuracyScore}% Accuracy
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500">{formatDate(item.createdAt)}</td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                          className="rounded border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                        >
                          {isExpanded ? 'Hide' : 'Inspect'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
