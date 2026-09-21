import { useEffect, useState } from 'react';
import type { AppImpactAnalysis, AppProfile, ImpactRating, SimulationComparison, TelemetrySample } from '../types';
import { SAMPLE_APPS, analyzeAppImpact } from '../services/appImpactService';
import { generateAppRecommendations } from '../services/recommendationService';
import { runAppSimulation } from '../services/appSimulationService';
import { apiClient } from '../services/apiClient';
import { percent, celsius } from '../services/formatters';

interface Props {
  telemetry: TelemetrySample;
}

export function PreInstallAnalysis({ telemetry }: Props) {
  const [apps, setApps] = useState<AppProfile[]>(SAMPLE_APPS);
  const [selectedAppId, setSelectedAppId] = useState<string>(SAMPLE_APPS[0].id);
  const [analysisResult, setAnalysisResult] = useState<AppImpactAnalysis | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationComparison | null>(null);

  useEffect(() => {
    apiClient.getAppProfiles().then((loadedApps) => {
      if (loadedApps && loadedApps.length > 0) {
        setApps(loadedApps);
        setSelectedAppId(loadedApps[0].id);
      }
    });
  }, []);

  const selectedApp = apps.find((app) => app.id === selectedAppId) || apps[0] || SAMPLE_APPS[0];

  const handleAnalyze = () => {
    const result = analyzeAppImpact(selectedApp, telemetry);
    setAnalysisResult(result);
    setSimulationResult(null); // reset previous simulation
    apiClient.postPrediction(result).catch(() => {});
  };

  const handleSimulateRun = () => {
    if (!analysisResult) return;
    const sim = runAppSimulation(selectedApp, telemetry, analysisResult);
    setSimulationResult(sim);
    apiClient.postSimulatedRun(sim).catch(() => {});
  };

  const recommendations = analysisResult
    ? generateAppRecommendations(analysisResult, telemetry)
    : null;

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

  const formatSize = (sizeMB: number) => {
    if (sizeMB >= 1024) {
      return `${(sizeMB / 1024).toFixed(1)} GB`;
    }
    return `${sizeMB} MB`;
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Pre-Installation Analysis</h3>
          <p className="text-xs text-slate-500">
            Predict how adding a new app will impact system RAM, CPU, storage, battery, and thermals.
          </p>
        </div>
        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
          Copilot Predictor
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-12">
        {/* Left Column: App Selection & Specs */}
        <div className="flex flex-col justify-between rounded-lg border border-slate-100 bg-slate-50 p-4 md:col-span-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Select Target App
            </label>
            <select
              value={selectedAppId}
              onChange={(e) => {
                setSelectedAppId(e.target.value);
                setAnalysisResult(null);
                setSimulationResult(null);
              }}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-xs focus:border-indigo-500 focus:outline-none"
            >
              {apps.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.name} ({formatSize(app.sizeMB)})
                </option>
              ))}
            </select>

            <div className="mt-4 flex flex-col gap-2 rounded-md bg-white p-3 border border-slate-200 text-xs">
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="text-slate-500">App Category:</span>
                <span className="font-medium text-slate-800">{selectedApp.category || 'Mobile App'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="text-slate-500">Download Size:</span>
                <span className="font-medium text-slate-800">{formatSize(selectedApp.sizeMB)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="text-slate-500">Estimated RAM Req:</span>
                <span className="font-medium text-slate-800">{formatSize(selectedApp.ramRequirementMB)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">CPU Intensity:</span>
                <span className="font-semibold uppercase text-indigo-600">{selectedApp.cpuIntensity}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-4">
            <button
              onClick={handleAnalyze}
              className="w-full rounded-md bg-indigo-600 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 active:scale-[0.99] transition-all"
            >
              1. Analyze Impact
            </button>
            <button
              onClick={handleSimulateRun}
              disabled={!analysisResult}
              className={`w-full rounded-md py-2 text-xs font-semibold shadow-xs transition-all ${
                analysisResult
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.99]'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              2. Simulate App Run 🚀
            </button>
          </div>
        </div>

        {/* Right Column: Results & Simulation Comparison */}
        <div className="flex flex-col justify-between rounded-lg border border-slate-100 bg-slate-50 p-4 md:col-span-7">
          {analysisResult && recommendations ? (
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <span className="text-xs text-slate-500">Target: {analysisResult.app.name}</span>
                  <h4 className="text-sm font-bold text-slate-900">Impact Analysis Result</h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Overall Impact:</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${overallBadgeBg(analysisResult.overallImpact)}`}>
                    {analysisResult.overallImpact}
                  </span>
                </div>
              </div>

              {/* Impact Matrix */}
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5 text-center">
                <div className="rounded border bg-white p-2 text-xs">
                  <div className="text-[10px] text-slate-400 font-medium uppercase">RAM</div>
                  <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold border ${impactBadgeColor(analysisResult.ramImpact)}`}>
                    {analysisResult.ramImpact}
                  </span>
                </div>
                <div className="rounded border bg-white p-2 text-xs">
                  <div className="text-[10px] text-slate-400 font-medium uppercase">CPU</div>
                  <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold border ${impactBadgeColor(analysisResult.cpuImpact)}`}>
                    {analysisResult.cpuImpact}
                  </span>
                </div>
                <div className="rounded border bg-white p-2 text-xs">
                  <div className="text-[10px] text-slate-400 font-medium uppercase">Storage</div>
                  <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold border ${impactBadgeColor(analysisResult.storageImpact)}`}>
                    {analysisResult.storageImpact}
                  </span>
                </div>
                <div className="rounded border bg-white p-2 text-xs">
                  <div className="text-[10px] text-slate-400 font-medium uppercase">Battery</div>
                  <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold border ${impactBadgeColor(analysisResult.batteryImpact)}`}>
                    {analysisResult.batteryImpact}
                  </span>
                </div>
                <div className="rounded border bg-white p-2 text-xs col-span-2 sm:col-span-1">
                  <div className="text-[10px] text-slate-400 font-medium uppercase">Thermal</div>
                  <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold border ${impactBadgeColor(analysisResult.thermalImpact)}`}>
                    {analysisResult.thermalImpact}
                  </span>
                </div>
              </div>

              {/* Phase 6: Simulation Comparison Section */}
              {simulationResult ? (
                <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50/60 p-3.5">
                  <div className="mb-2 flex items-center justify-between border-b border-emerald-200/80 pb-2">
                    <h5 className="text-xs font-bold text-emerald-900">Prediction vs Actual Simulation</h5>
                    <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-bold text-white">
                      Simulation Accuracy: {simulationResult.accuracyScore}%
                    </span>
                  </div>

                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-emerald-200 text-[11px] font-semibold text-emerald-800 uppercase">
                        <th className="py-1">Metric</th>
                        <th className="py-1">Predicted</th>
                        <th className="py-1">Simulated Actual</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-100 text-slate-700">
                      {simulationResult.metricComparisons.map((row) => (
                        <tr key={row.metric}>
                          <td className="py-1.5 font-medium text-slate-800">{row.metric}</td>
                          <td className="py-1.5">
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold border ${impactBadgeColor(row.predicted)}`}>
                              {row.predicted}
                            </span>
                          </td>
                          <td className="py-1.5 font-semibold text-slate-900">{row.actualValueFormatted}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {/* Recommendations */}
              <div className="mt-3 rounded-md bg-indigo-50/70 p-3.5 border border-indigo-100">
                <div className="mb-2">
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-indigo-900">
                    Why this prediction?
                  </h5>
                  <p className="mt-0.5 text-xs text-indigo-800 font-medium">
                    {recommendations.summaryReason}
                  </p>
                </div>

                <div className="mt-2.5 border-t border-indigo-100/80 pt-2">
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-indigo-900 mb-1.5">
                    Recommended Actions
                  </h5>
                  <ul className="flex flex-col gap-1.5">
                    {recommendations.recommendedActions.map((action, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-indigo-950 font-medium">
                        <span className="text-indigo-600 font-bold">✓</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center py-8 text-center">
              <div className="rounded-full bg-indigo-100 p-3 text-indigo-600 mb-2">
                📊
              </div>
              <p className="text-xs font-medium text-slate-700">Ready to Predict App Performance Impact</p>
              <p className="mt-1 text-[11px] text-slate-400 max-w-xs">
                Select an app from the list and click "Analyze Impact" to test against current device telemetry.
              </p>
            </div>
          )}

          {/* Current Device Snapshot Footer */}
          <div className="mt-3 flex flex-wrap justify-between rounded bg-slate-200/60 px-3 py-1.5 text-[11px] text-slate-600">
            <span>
              <strong>RAM:</strong> {telemetry.ramTotal ? `${telemetry.ramUsed?.toFixed(1) ?? '?'}/${telemetry.ramTotal.toFixed(1)} GB (${telemetry.ramUsage}%)` : percent(telemetry.ramUsage)}
            </span>
            <span>
              <strong>Storage:</strong> {telemetry.storageAvailable ? `${telemetry.storageAvailable.toFixed(1)} GB free` : percent(100 - telemetry.storageUsage)}
            </span>
            <span>
              <strong>Battery:</strong> {percent(telemetry.batteryLevel)}
            </span>
            <span>
              <strong>Temp:</strong> {celsius(telemetry.temperature)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
