import { useState, useEffect } from 'react';
import { apiClient } from '../services/apiClient';
import type { AdaptiveDayState, AdaptiveDayRecommendation } from '../types';
import { formatDateTime } from '../services/formatters';

export function AdaptiveIntelligencePage() {
  const [state, setState] = useState<AdaptiveDayState | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState<AdaptiveDayRecommendation | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const fetchState = async () => {
    try {
      const res = await apiClient.getAdaptiveDayState();
      if (res) {
        setState(res);
      }
    } catch {
      // Keep quiet on fetch error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
    const timer = setInterval(fetchState, 15000);
    return () => clearInterval(timer);
  }, []);

  const handleTogglePause = async () => {
    if (!state) return;
    const newPause = !state.preferences.isPaused;
    await apiClient.updateAdaptiveDayPreferences({ isPaused: newPause });
    fetchState();
  };

  const handleToggleLocation = async () => {
    if (!state) return;
    const newLoc = !state.preferences.locationPermissionEnabled;
    await apiClient.updateAdaptiveDayPreferences({ locationPermissionEnabled: newLoc });
    fetchState();
  };

  const handleDismissPattern = async () => {
    if (!state) return;
    const ctxType = state.currentContext.contextType;
    await apiClient.dismissAdaptiveDayPattern(ctxType);
    setActionMessage(`Pattern '${ctxType}' dismissed from active routines.`);
    setTimeout(() => setActionMessage(null), 4000);
    fetchState();
  };

  const handleConfirmAction = async () => {
    if (!confirmModal) return;
    setIsApplying(true);
    const res = await apiClient.applyAdaptiveDayAction(confirmModal.id);
    setIsApplying(false);
    setConfirmModal(null);

    if (res?.success) {
      setActionMessage(res.message);
      setTimeout(() => setActionMessage(null), 5000);
      fetchState();
    }
  };

  const currentContext = state?.currentContext;
  const preferences = state?.preferences;
  const isPaused = preferences?.isPaused ?? false;

  const contextColors: Record<string, string> = {
    Development: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    Gaming: 'bg-purple-50 text-purple-700 border-purple-200',
    Study: 'bg-sky-50 text-sky-700 border-sky-200',
    College: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Travel: 'bg-amber-50 text-amber-700 border-amber-200',
    Reading: 'bg-teal-50 text-teal-700 border-teal-200',
    Sleep: 'bg-slate-100 text-slate-700 border-slate-300',
    General: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  const activeBadgeClass = currentContext
    ? contextColors[currentContext.contextType] || contextColors.General
    : contextColors.General;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header */}
      <div className="border-b border-slate-200 pb-3">
        <h2 className="text-xl font-bold text-slate-900">Adaptive Intelligence</h2>
        <p className="text-xs text-slate-500 mt-1">
          Real-time activity pattern tracking and contextual device profile monitoring.
        </p>
      </div>

      {/* Main Live Prototype Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        {/* Card Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">Live Adaptive Day Telemetry</h3>
              {currentContext && (
                <>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${activeBadgeClass}`}>
                    {currentContext.contextType} Context
                  </span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-2xs font-semibold text-slate-600">
                    {currentContext.confidencePercent}% Confidence
                  </span>
                </>
              )}
            </div>
            {currentContext && (
              <p className="mt-0.5 text-xs text-slate-500">
                {currentContext.patternState} · Next: <strong className="text-slate-700">{currentContext.predictedNextContext}</strong> (~{currentContext.predictedTimeRemainingMinutes} mins)
              </p>
            )}
          </div>

          {/* User Controls */}
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={handleToggleLocation}
              className={`rounded px-2.5 py-1 text-xs font-semibold border transition ${
                preferences?.locationPermissionEnabled
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
              }`}
            >
              Location {preferences?.locationPermissionEnabled ? 'On' : 'Off'}
            </button>

            <button
              onClick={handleTogglePause}
              className={`rounded px-3 py-1 text-xs font-semibold border transition ${
                isPaused
                  ? 'bg-amber-100 border-amber-300 text-amber-800'
                  : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {isPaused ? 'Resume Routine' : 'Pause Monitoring'}
            </button>

            <button
              onClick={handleDismissPattern}
              disabled={isPaused || currentContext?.contextType === 'General'}
              className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              title="Dismiss current routine prediction if inaccurate"
            >
              [Not My Routine]
            </button>
          </div>
        </div>

        {/* Audit Action Notification */}
        {actionMessage && (
          <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-medium text-emerald-800">
            ✓ {actionMessage}
          </div>
        )}

        {/* Live Evidence & Recommendations */}
        {loading && !state ? (
          <div className="py-6 text-center text-xs text-slate-500">Reading telemetry pattern state...</div>
        ) : !isPaused && currentContext ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            {/* Real Telemetry Evidence */}
            <div className="lg:col-span-5 rounded-lg border border-slate-100 bg-slate-50/80 p-4">
              <h4 className="text-2xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Real Telemetry Evidence
              </h4>
              <ul className="space-y-2 text-xs text-slate-700">
                {currentContext.evidence.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-blue-500 font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommended Actions */}
            <div className="lg:col-span-7 flex flex-col justify-between">
              <div>
                <h4 className="text-2xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Context Recommendations (Ask Before Applying)
                </h4>

                <div className="space-y-2.5">
                  {currentContext.recommendations.length > 0 ? (
                    currentContext.recommendations.map((rec) => (
                      <div
                        key={rec.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-2xs"
                      >
                        <div className="max-w-md">
                          <p className="text-xs font-bold text-slate-800">{rec.title}</p>
                          <p className="text-2xs text-slate-500 mt-0.5">{rec.description}</p>
                        </div>

                        {rec.isApplied ? (
                          <span className="rounded bg-emerald-50 px-2.5 py-1 text-2xs font-bold text-emerald-700 border border-emerald-200">
                            ✓ Applied
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmModal(rec)}
                            className="rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 shadow-2xs"
                          >
                            {rec.actionText}
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic">No explicit device adjustments recommended for current profile.</p>
                  )}
                </div>
              </div>

              <p className="mt-3 text-2xs text-slate-400">
                * Recommendations operate in 'Ask before applying' mode. Deeper native system-level actions require future Android / iQOO OS integration.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 p-4 text-center text-xs text-amber-700 bg-amber-50 rounded-lg border border-amber-200">
            Adaptive Day tracking is paused. Click 'Resume Routine' above to reactivate pattern learning.
          </div>
        )}
      </div>

      {/* Routine Event Log Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 border-b border-slate-100 pb-2">
          Adaptive Day Routine Event Log
        </h3>

        {state?.recentEvents && state.recentEvents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                  <th className="py-2 px-3">Context Type</th>
                  <th className="py-2 px-3">Confidence</th>
                  <th className="py-2 px-3">Evidence Collected</th>
                  <th className="py-2 px-3">Action / Audit</th>
                  <th className="py-2 px-3">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.recentEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{evt.contextType}</td>
                    <td className="py-2.5 px-3">
                      <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                        {evt.confidenceLevel}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                      {evt.evidence.join(' · ')}
                    </td>
                    <td className="py-2.5 px-3">
                      {evt.dismissed ? (
                        <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                          Dismissed [Not My Routine]
                        </span>
                      ) : evt.actionApplied ? (
                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                          Applied ({evt.actionApplied})
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Monitored</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">{formatDateTime(evt.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-4 text-center text-xs text-slate-500">
            No Adaptive Day routine events logged yet.
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-slate-200">
            <h4 className="text-base font-bold text-slate-900">User Confirmation Required</h4>
            <p className="mt-2 text-xs text-slate-600">
              Adaptive Day recommends applying: <strong className="text-slate-900">{confirmModal.title}</strong>
            </p>
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              {confirmModal.description}
            </div>
            <p className="mt-3 text-2xs text-slate-500">
              Mode: <strong>Ask before applying changes</strong>. No settings will be altered without explicit consent.
            </p>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="rounded border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={isApplying}
                className="rounded bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs"
              >
                {isApplying ? 'Applying…' : 'Approve & Apply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
