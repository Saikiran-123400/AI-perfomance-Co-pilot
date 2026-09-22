import { useState, useEffect } from 'react';
import { apiClient } from '../services/apiClient';
import type { AdaptiveDayState, AdaptiveDayRecommendation } from '../types';

export function AdaptiveDayCard() {
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
      // Keep quiet on error
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

  if (loading && !state) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-xs font-medium text-slate-500 animate-pulse">
        Analyzing routine context and live activity patterns…
      </div>
    );
  }

  if (!state) return null;

  const { currentContext, preferences } = state;
  const isPaused = preferences.isPaused;

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

  const badgeClass = contextColors[currentContext.contextType] || contextColors.General;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-all">
      {/* Top Banner Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">Adaptive Day Routine</h3>
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${badgeClass}`}>
                {currentContext.contextType} Context
              </span>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-2xs font-semibold text-slate-600">
                {currentContext.confidencePercent}% Confidence
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {currentContext.patternState} · Next: <strong className="text-slate-700">{currentContext.predictedNextContext}</strong> (~{currentContext.predictedTimeRemainingMinutes} mins)
            </p>
          </div>
        </div>

        {/* User Controls: Pause & Location */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={handleToggleLocation}
            title="Toggle location-based context permission"
            className={`rounded px-2.5 py-1 text-xs font-semibold border transition ${
              preferences.locationPermissionEnabled
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
            }`}
          >
            Location {preferences.locationPermissionEnabled ? 'On' : 'Off'}
          </button>

          <button
            onClick={handleTogglePause}
            className={`rounded px-3 py-1 text-xs font-semibold border transition ${
              isPaused
                ? 'bg-amber-100 border-amber-300 text-amber-800'
                : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {isPaused ? 'Resume Adaptive Day' : 'Pause Routine'}
          </button>

          <button
            onClick={handleDismissPattern}
            disabled={isPaused || currentContext.contextType === 'General'}
            className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            title="Dismiss current routine prediction if inaccurate"
          >
            [Not My Routine]
          </button>
        </div>
      </div>

      {/* Audit Action Message */}
      {actionMessage && (
        <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-medium text-emerald-800">
          ✓ {actionMessage}
        </div>
      )}

      {/* Main Context Details */}
      {!isPaused ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          {/* Real Telemetry Evidence */}
          <div className="lg:col-span-5 rounded-lg border border-slate-100 bg-slate-50/70 p-3.5">
            <h4 className="text-2xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Real Telemetry Evidence
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-700">
              {currentContext.evidence.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-blue-500 font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* User-Approved Recommendations */}
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
              * Actions operate in 'Ask before applying' mode. Windows prototype models setting hooks for native Android/iQOO system integration.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 p-4 text-center text-xs text-amber-700 bg-amber-50 rounded-lg border border-amber-200">
          Adaptive Day activity pattern tracking is currently paused. Click 'Resume Routine' to reactivate context predictions.
        </div>
      )}

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
