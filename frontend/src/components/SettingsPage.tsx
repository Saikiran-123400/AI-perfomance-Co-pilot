import { useState } from 'react';

interface Props {
  onResetOnboarding?: () => void;
}

export function SettingsPage({ onResetOnboarding }: Props) {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState('5');
  const [unitPreference, setUnitPreference] = useState('auto');

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900">Settings & System Status</h2>
        <p className="mt-1 text-xs text-slate-500">
          Manage system telemetry settings, unit formatting, and onboarding setup check.
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Telemetry Settings Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
              Telemetry Agent Configuration
            </h3>

            <div className="flex flex-col gap-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800">Auto Refresh Telemetry</span>
                  <p className="text-slate-500 text-[11px]">Fetch latest telemetry sample automatically</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <div>
                  <span className="font-bold text-slate-800">Polling Interval</span>
                  <p className="text-slate-500 text-[11px]">Time between agent telemetry cycles</p>
                </div>
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(e.target.value)}
                  className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800"
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
                  className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800"
                >
                  <option value="auto">Auto (MB / GB)</option>
                  <option value="gb">Gigabytes (GB)</option>
                  <option value="mb">Megabytes (MB)</option>
                </select>
              </div>

              {onResetOnboarding ? (
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <div>
                    <span className="font-bold text-slate-800">Device Onboarding</span>
                    <p className="text-slate-500 text-[11px]">Re-run setup and hardware signal check</p>
                  </div>
                  <button
                    onClick={onResetOnboarding}
                    className="rounded border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Re-run Setup
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-4 rounded bg-slate-50 p-2.5 text-[11px] text-slate-500 border border-slate-200">
            Telemetry collection is active. Settings changes are applied immediately.
          </div>
        </div>

        {/* System & Backend Info Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
              Environment & Infrastructure
            </h3>

            <div className="flex flex-col gap-2.5 text-xs">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Application:</span>
                <span className="font-bold text-slate-900">AI Performance Copilot</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Telemetry Agent:</span>
                <span className="font-semibold text-emerald-700">Windows Telemetry Agent (monitor.py)</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Backend API:</span>
                <span className="font-mono text-slate-800">http://localhost:4000/api</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Database:</span>
                <span className="font-semibold text-slate-800">SQLite (copilot.db)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Build Version:</span>
                <span className="font-bold text-slate-800">v1.0 Professional</span>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded bg-slate-50 p-2.5 text-[11px] text-slate-700 font-medium border border-slate-200">
            Backend service connection active. Live telemetry stream operational.
          </div>
        </div>
      </div>
    </div>
  );
}
