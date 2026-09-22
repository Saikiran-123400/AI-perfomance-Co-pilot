import { useDashboard } from '../services/useDashboard';
import {
  bandFor,
  celsius,
  clockTime,
  latencyMs,
  minutesToHuman,
  percent,
  throughputKbps,
} from '../services/formatters';
import { HealthScore } from './HealthScore';
import { MetricCard } from './MetricCard';
import { IssueList } from './IssueList';

export function Dashboard() {
  const { data, error, loading, refresh } = useDashboard();

  if (loading && !data) {
    return (
      <div className="py-12 text-center text-xs font-medium text-slate-500">
        Reading device telemetry…
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-6">
        <p className="font-semibold text-rose-700 text-sm">No telemetry available</p>
        <p className="mt-1 text-xs text-rose-600">{error}</p>
        <button
          onClick={refresh}
          className="mt-3 rounded bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
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
    <div className="flex flex-col gap-5">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-900">Device Status & Monitoring</h2>
            {source.includes('Windows') || source.startsWith('Live') ? (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                Live Device Telemetry
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-200">
                Simulator (Fallback)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Data Source: <strong className="text-slate-800">{source}</strong> · Updated {clockTime(latest.timestamp)}
          </p>
        </div>
        <button
          onClick={refresh}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
        >
          Refresh now
        </button>
      </header>

      {/* Health Score Overview */}
      <HealthScore diagnosis={data.diagnosis} prediction={data.prediction} />

      {/* Metric Cards Grid */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Hardware Signals
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <MetricCard
            label="CPU"
            value={percent(latest.cpuUsage)}
            fill={latest.cpuUsage}
            severity={bandFor('cpu', latest.cpuUsage)}
          />
          <MetricCard
            label="Memory"
            value={percent(latest.ramUsage)}
            fill={latest.ramUsage}
            severity={bandFor('ram', latest.ramUsage)}
            note={latest.ramUsed && latest.ramTotal ? `${latest.ramUsed.toFixed(1)} / ${latest.ramTotal.toFixed(1)} GB` : undefined}
          />
          <MetricCard
            label="GPU"
            value={latest.gpuUsage !== null && latest.gpuUsage !== undefined ? percent(latest.gpuUsage) : 'Unavailable'}
            fill={latest.gpuUsage !== null && latest.gpuUsage !== undefined ? latest.gpuUsage : 0}
            severity={bandFor('gpu', latest.gpuUsage)}
            note={latest.gpuVramUsed && latest.gpuVramTotal ? `VRAM: ${(latest.gpuVramUsed / 1024).toFixed(1)} / ${(latest.gpuVramTotal / 1024).toFixed(1)} GB` : 'Hardware sensor unavailable'}
          />
          <MetricCard
            label="Temperature"
            value={latest.temperature !== null && latest.temperature !== undefined ? celsius(latest.temperature) : 'Unavailable'}
            fill={latest.temperature !== null && latest.temperature !== undefined ? (latest.temperature / 50) * 100 : 0}
            severity={bandFor('temperature', latest.temperature)}
            note={latest.gpuTemp !== null && latest.gpuTemp !== undefined ? `GPU: ${celsius(latest.gpuTemp)}` : undefined}
          />
          <MetricCard
            label="Battery"
            value={latest.batteryLevel !== null && latest.batteryLevel !== undefined ? percent(latest.batteryLevel) : 'Unavailable'}
            fill={latest.batteryLevel !== null && latest.batteryLevel !== undefined ? latest.batteryLevel : 0}
            severity={bandFor('battery', latest.batteryLevel)}
            note={latest.batteryLevel !== null && latest.batteryLevel !== undefined ? (latest.charging ? `${latest.chargingStatus || 'Plugged / Charging'}` : minutesToHuman(data.prediction.batteryMinutesRemaining)) : 'No battery sensor'}
          />
          <MetricCard
            label="Network Latency"
            value={latest.networkLatencyMs !== null && latest.networkLatencyMs !== undefined ? latencyMs(latest.networkLatencyMs) : 'Unavailable'}
            fill={latest.networkLatencyMs !== null && latest.networkLatencyMs !== undefined ? Math.min(100, (latest.networkLatencyMs / 200) * 100) : 0}
            severity={bandFor('latency', latest.networkLatencyMs)}
            note={latest.downloadKbps !== null && latest.downloadKbps !== undefined ? `Throughput: ${throughputKbps(latest.downloadKbps)}` : 'Ping measurement'}
          />
        </div>
      </div>

      {/* Identified Issues */}
      <IssueList diagnosis={data.diagnosis} prediction={data.prediction} />

      {/* Active Applications Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <span>Active Applications</span>
              {Array.isArray(activeAppsList) && activeAppsList.length > 0 ? (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  {activeAppsList.length} running
                </span>
              ) : null}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Processes currently executing on the system
            </p>
          </div>
        </div>

        {Array.isArray(activeAppsList) ? (
          activeAppsList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                    <th className="py-2 px-3">Process Name</th>
                    <th className="py-2 px-3">PID</th>
                    <th className="py-2 px-3 text-right">Memory Usage</th>
                    <th className="py-2 px-3 text-right">CPU Load</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeAppsList.map((app, idx) => (
                    <tr
                      key={app.pid ? `${app.name}-${app.pid}` : `${app.name}-${idx}`}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{app.name}</td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono">{app.pid || 'N/A'}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                        {app.ramFormatted || (app.ramMb ? (app.ramMb >= 1024 ? `${(app.ramMb / 1024).toFixed(2)} GB` : `${Math.round(app.ramMb)} MB`) : 'N/A')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                        {app.cpuFormatted || (app.cpuPercent !== undefined ? `${app.cpuPercent.toFixed(1)}%` : '0%')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-6 text-center text-xs font-medium text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              No active user applications detected
            </div>
          )
        ) : (
          <div className="py-6 text-center text-xs font-medium text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            Unavailable
          </div>
        )}
      </div>

      {error ? (
        <p className="text-xs text-amber-600">Showing last available telemetry snapshot. {error}</p>
      ) : null}
    </div>
  );
}
