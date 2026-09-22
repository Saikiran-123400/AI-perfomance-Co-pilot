import { useEffect, useState } from 'react';
import type { AppSessionAnalysis, ImpactRating } from '../types';
import { apiClient } from '../services/apiClient';

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
  const [sessions, setSessions] = useState<AppSessionAnalysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetch('http://localhost:4000/api/simulated-runs')
        .then((res) => (res.ok ? res.json() : []))
        .catch(() => []),
      apiClient.getAppSessions(),
    ])
      .then(([runsData, sessionsData]) => {
        if (mounted) {
          setRuns(Array.isArray(runsData) ? runsData : []);
          setSessions(sessionsData);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const formatDate = (isoOrMs: string | number) => {
    try {
      const d = new Date(isoOrMs);
      return d.toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return String(isoOrMs);
    }
  };

  const overallBadgeBg = (impact: ImpactRating) => {
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

  return (
    <div className="flex flex-col gap-5">
      {/* Top Header */}
      <div className="border-b border-slate-200 pb-3">
        <h2 className="text-xl font-bold text-slate-900">Activity & Event History</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Stored record log of performance predictions, app session analyses, and hardware events.
        </p>
      </div>

      {/* App Session History Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 border-b border-slate-100 pb-2">
          App Session Analyses
        </h3>

        {loading ? (
          <p className="py-4 text-xs text-slate-500 font-medium">Loading session records...</p>
        ) : sessions.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 bg-slate-50 rounded border border-dashed border-slate-200">
            No app sessions recorded yet. Start a session on the App Analyzer page to inspect live process resource drain.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                  <th className="py-2 px-3">App Name</th>
                  <th className="py-2 px-3">Duration</th>
                  <th className="py-2 px-3 text-right">Avg CPU</th>
                  <th className="py-2 px-3 text-right">Peak CPU</th>
                  <th className="py-2 px-3 text-right">Avg RAM</th>
                  <th className="py-2 px-3">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((sess, idx) => (
                  <tr key={sess.id || idx} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{sess.appName}</td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {sess.durationSeconds >= 60 ? `${Math.floor(sess.durationSeconds / 60)}m ${sess.durationSeconds % 60}s` : `${sess.durationSeconds}s`}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-800">{sess.avgCpuPercent}%</td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-800">{sess.peakCpuPercent}%</td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-800">{Math.round(sess.avgRamMb)} MB</td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">{formatDate(sess.startTime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Validation Runs History Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 border-b border-slate-100 pb-2">
          Performance Prediction Log
        </h3>

        {loading ? (
          <p className="py-4 text-xs text-slate-500 font-medium">Loading prediction logs...</p>
        ) : runs.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 bg-slate-50 rounded border border-dashed border-slate-200">
            No prediction logs recorded yet. Perform a "What If I Install?" analysis to populate prediction history.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                  <th className="py-2 px-3">App Name</th>
                  <th className="py-2 px-3">Predicted Impact</th>
                  <th className="py-2 px-3">Actual Impact</th>
                  <th className="py-2 px-3">Accuracy Score</th>
                  <th className="py-2 px-3">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {runs.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{item.appName}</td>
                    <td className="py-2.5 px-3">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold border ${overallBadgeBg(item.predictedOverall)}`}>
                        {item.predictedOverall}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold border ${overallBadgeBg(item.actualOverall)}`}>
                        {item.actualOverall}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {item.accuracyScore}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">{formatDate(item.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
