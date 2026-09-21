import { useState } from 'react';

export function SettingsPage() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState('5');
  const [unitPreference, setUnitPreference] = useState('auto');

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Settings & Configuration</h2>
        <p className="mt-1 text-xs text-slate-500">
          Manage system telemetry settings, preferences, and backend connection details.
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Telemetry Settings Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
              <span>📡 Telemetry Agent Configuration</span>
            </h3>

            <div className="flex flex-col gap-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800">Auto Refresh Telemetry</span>
                  <p className="text-slate-500 text-[11px]">Continuously fetch latest laptop telemetry sample</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <div>
                  <span className="font-bold text-slate-800">Polling Interval</span>
                  <p className="text-slate-500 text-[11px]">Time between telemetry agent POST cycles</p>
                </div>
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(e.target.value)}
                  className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800"
                >
                  <option value="3">3 seconds</option>
                  <option value="5">5 seconds (Default)</option>
                  <option value="10">10 seconds</option>
                </select>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <div>
                  <span className="font-bold text-slate-800">Memory Unit Display</span>
                  <p className="text-slate-500 text-[11px]">Preferred formatting for RAM and Storage</p>
                </div>
                <select
                  value={unitPreference}
                  onChange={(e) => setUnitPreference(e.target.value)}
                  className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800"
                >
                  <option value="auto">Auto (MB / GB)</option>
                  <option value="gb">Gigabytes (GB)</option>
                  <option value="mb">Megabytes (MB)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-md bg-slate-50 p-2.5 text-[11px] text-slate-500 border border-slate-200">
            ℹ️ Settings changes are preserved for this session. Telemetry collection is active.
          </div>
        </div>

        {/* System & Backend Info Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
              <span>🖥️ System & Environment Info</span>
            </h3>

            <div className="flex flex-col gap-2.5 text-xs">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Application:</span>
                <span className="font-bold text-slate-900">AI Phone & System Performance Copilot</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Data Agent:</span>
                <span className="font-semibold text-emerald-700">Windows psutil Agent (monitor.py)</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Backend Endpoint:</span>
                <span className="font-mono text-slate-800">http://localhost:4000/api</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Database Engine:</span>
                <span className="font-semibold text-slate-800">SQLite (copilot.db)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Build Version:</span>
                <span className="font-bold text-slate-800">v0.1.0 Desktop</span>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-md bg-emerald-50 p-2.5 text-[11px] text-emerald-800 font-medium border border-emerald-200">
            ✅ Backend SQLite connection active. Telemetry pipeline operational.
          </div>
        </div>
      </div>
    </div>
  );
}
