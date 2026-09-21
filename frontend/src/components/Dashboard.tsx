import { useDashboard } from '../services/useDashboard';
import {
  bandFor,
  celsius,
  clockTime,
  minutesToHuman,
  percent,
} from '../services/formatters';
import { HealthScore } from './HealthScore';
import { MetricCard } from './MetricCard';
import { IssueList } from './IssueList';

export function Dashboard() {
  const { data, error, loading, refresh } = useDashboard();

  if (loading && !data) {
    return (
      <div className="py-12 text-center text-slate-500">
        Reading device telemetry…
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-6">
        <p className="font-medium text-rose-700">No telemetry available</p>
        <p className="mt-1 text-sm text-rose-600">{error}</p>
        <button
          onClick={refresh}
          className="mt-3 rounded bg-rose-600 px-3 py-1.5 text-sm text-white hover:bg-rose-700"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { latest, source } = data.telemetry;

  const activeAppsList = latest.activeApplications ?? latest.activeApps;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Device Performance Overview</h2>
            {source === 'Windows Laptop' || source === 'Windows PC' || source === 'Windows' ? (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                🟢 Live Laptop Data
              </span>
            ) : source === 'Android Device' ? (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                🟢 Live Device Data (Android)
              </span>
            ) : source === 'iOS Device' ? (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                🟢 Live Device Data (iOS)
              </span>
            ) : source.startsWith('Live') ? (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                🟢 Live Laptop Data
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-300">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                🟡 Simulator (Fallback)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Data Source: <strong className="text-slate-800">{source}</strong> · Updated {clockTime(latest.timestamp)}
          </p>
        </div>
        <button
          onClick={refresh}
          className="rounded border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
        >
          Refresh now
        </button>
      </header>

      <HealthScore diagnosis={data.diagnosis} prediction={data.prediction} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          label="CPU"
          value={percent(latest.cpuUsage)}
          fill={latest.cpuUsage}
          severity={bandFor('cpu', latest.cpuUsage)}
        />
        <MetricCard
          label="RAM"
          value={percent(latest.ramUsage)}
          fill={latest.ramUsage}
          severity={bandFor('ram', latest.ramUsage)}
          note={latest.ramUsed && latest.ramTotal ? `${latest.ramUsed.toFixed(1)} / ${latest.ramTotal.toFixed(1)} GB` : undefined}
        />
        <MetricCard
          label="Storage"
          value={percent(latest.storageUsage)}
          fill={latest.storageUsage}
          severity={bandFor('storage', latest.storageUsage)}
          note={latest.storageAvailable !== undefined && latest.storageAvailable !== null ? `${latest.storageAvailable.toFixed(1)} GB free` : undefined}
        />
        <MetricCard
          label="Temperature"
          value={latest.temperature !== null && latest.temperature !== undefined ? celsius(latest.temperature) : 'Unavailable'}
          fill={latest.temperature !== null && latest.temperature !== undefined ? (latest.temperature / 50) * 100 : 0}
          severity={latest.temperature !== null && latest.temperature !== undefined ? bandFor('temperature', latest.temperature) : 'ok'}
        />
        <MetricCard
          label="Battery"
          value={latest.batteryLevel !== null && latest.batteryLevel !== undefined ? percent(latest.batteryLevel) : 'Unavailable'}
          fill={latest.batteryLevel !== null && latest.batteryLevel !== undefined ? latest.batteryLevel : 0}
          severity={latest.batteryLevel !== null && latest.batteryLevel !== undefined ? bandFor('battery', latest.batteryLevel) : 'ok'}
          note={latest.batteryLevel !== null && latest.batteryLevel !== undefined ? (latest.charging ? '⚡ Charging' : minutesToHuman(data.prediction.batteryMinutesRemaining)) : 'No battery sensor'}
        />
      </div>

      <IssueList diagnosis={data.diagnosis} prediction={data.prediction} />

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <span>⚡ Active Applications</span>
              {Array.isArray(activeAppsList) && activeAppsList.length > 0 ? (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {activeAppsList.length} processes
                </span>
              ) : null}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Last updated: <strong className="text-slate-700">{clockTime(latest.timestamp)}</strong>
            </p>
          </div>
        </div>

        {Array.isArray(activeAppsList) ? (
          activeAppsList.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {activeAppsList.map((app, idx) => (
                <div
                  key={app.pid ? `${app.name}-${app.pid}` : `${app.name}-${idx}`}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/60 p-3 hover:bg-slate-100/80 transition-colors"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="font-semibold text-slate-800 text-sm truncate" title={app.name}>
                      {app.name}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {app.pid ? `PID: ${app.pid}` : 'Active App'}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="inline-flex items-center text-xs font-semibold text-slate-700 bg-slate-200/70 px-2 py-0.5 rounded">
                      💾 {app.ramFormatted || (app.ramMb ? (app.ramMb >= 1024 ? `${(app.ramMb / 1024).toFixed(2)} GB` : `${Math.round(app.ramMb)} MB`) : 'N/A')}
                    </span>
                    <span className="inline-flex items-center text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      ⚡ {app.cpuFormatted || (app.cpuPercent !== undefined ? `${app.cpuPercent.toFixed(1)}%` : '0%')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-sm font-medium text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              No active user applications detected
            </div>
          )
        ) : (
          <div className="py-6 text-center text-sm font-medium text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            Unavailable
          </div>
        )}
      </div>

      {error ? (
        <p className="text-sm text-amber-600">Showing the last good reading. {error}</p>
      ) : null}
    </div>
  );
}
