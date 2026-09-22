import { useState, useEffect } from 'react';
import { apiClient } from '../services/apiClient';
import type { DiscoverPayload } from '../types';

export function DiscoverPage() {
  const [data, setData] = useState<DiscoverPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDiscoverFeed = async () => {
    setLoading(true);
    try {
      const feed = await apiClient.getDiscoverFeed();
      setData(feed);
    } catch {
      // Ignore error gracefully
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDiscoverFeed();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDiscoverFeed();
    setRefreshing(false);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Top Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Discover</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Personalized resources, updates and recommendations based on how you use your device.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          {refreshing ? 'Refreshing...' : 'Refresh Feed'}
        </button>
      </header>

      {loading ? (
        <div className="py-12 text-center text-xs font-medium text-slate-500 animate-pulse">
          Analyzing device telemetry, running stack context, and retrieving real resources...
        </div>
      ) : !data ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
          Unable to load recommendations right now. Verify backend service connection.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* SECTION 1: PERSONALIZED FOR YOU */}
          <section className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 p-5 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-indigo-100 pb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                Personalized For You
              </span>
              <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-bold text-indigo-900 border border-indigo-200">
                {data.activeContextSummary.detectedStack}
              </span>
            </div>

            <p className="text-sm font-medium text-slate-800 leading-relaxed">
              {data.personalizedSummary}
            </p>

            {/* Context Metrics Pills */}
            <div className="flex flex-wrap gap-2 pt-1 text-xs">
              <span className="rounded bg-white px-2.5 py-1 text-slate-700 font-semibold border border-slate-200">
                Active Apps: {data.activeContextSummary.activeApps.join(', ') || 'System Core'}
              </span>
              <span className="rounded bg-white px-2.5 py-1 text-slate-700 font-semibold border border-slate-200">
                CPU Load: {data.activeContextSummary.cpuPercent}%
              </span>
              <span className="rounded bg-white px-2.5 py-1 text-slate-700 font-semibold border border-slate-200">
                RAM Usage: {data.activeContextSummary.ramPercent}%
              </span>
              {data.activeContextSummary.temperatureC !== null ? (
                <span className="rounded bg-white px-2.5 py-1 text-slate-700 font-semibold border border-slate-200">
                  Temp: {data.activeContextSummary.temperatureC.toFixed(1)}°C
                </span>
              ) : null}
            </div>
          </section>

          {/* SECTION 2: YOUTUBE / LEARNING VIDEOS */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">YOUTUBE & VIDEO LEARNING</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Targeted video tutorials based on your active programming tools and workload.
                </p>
              </div>
            </div>

            {data.youtubeState.available && data.youtubeState.videos.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {data.youtubeState.videos.map((vid) => (
                  <div
                    key={vid.id}
                    className="flex flex-col justify-between rounded-lg border border-slate-200 bg-slate-50/50 overflow-hidden hover:border-slate-300 transition-colors"
                  >
                    {vid.thumbnailUrl ? (
                      <img
                        src={vid.thumbnailUrl}
                        alt={vid.title}
                        className="h-36 w-full object-cover"
                      />
                    ) : (
                      <div className="h-36 w-full bg-slate-200 flex items-center justify-center text-xs text-slate-500">
                        YouTube Video
                      </div>
                    )}
                    <div className="p-3.5 flex flex-col gap-2 flex-1 justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block mb-1">
                          {vid.topic}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                          {vid.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {vid.channelTitle} {vid.publishedAt ? `• ${vid.publishedAt}` : ''}
                        </p>
                      </div>
                      <a
                        href={vid.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center justify-center rounded bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
                      >
                        Watch on YouTube
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                <span className="font-bold text-slate-800 block mb-1">YouTube recommendations unavailable</span>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  {data.youtubeState.message ||
                    'YouTube API key is not configured in backend/.env. Add YOUTUBE_API_KEY to enable live search results.'}
                </p>
              </div>
            )}
          </section>

          {/* SECTION 3: SOFTWARE UPDATES */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col gap-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">SOFTWARE & TOOL UPDATES</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Verified version status of installed applications from official vendor release channels.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="p-2.5">Application</th>
                    <th className="p-2.5">Publisher</th>
                    <th className="p-2.5">Installed Version</th>
                    <th className="p-2.5">Latest Version</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5">Official Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.softwareUpdates.map((up) => (
                    <tr key={up.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-900">{up.name}</td>
                      <td className="p-2.5 text-slate-500 text-[11px]">{up.publisher || 'Official Vendor'}</td>
                      <td className="p-2.5 font-mono text-[11px] text-slate-700">{up.installedVersion}</td>
                      <td className="p-2.5 font-mono text-[11px] text-slate-900 font-bold">{up.latestVersion}</td>
                      <td className="p-2.5">
                        {up.status === 'Update available' ? (
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200">
                            Update available
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                            Up to date
                          </span>
                        )}
                      </td>
                      <td className="p-2.5">
                        <a
                          href={up.officialUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          View Update
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* SECTION 4: HARDWARE & PRODUCT RECOMMENDATIONS */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col gap-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">HARDWARE & PRODUCT RECOMMENDATIONS</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Potential hardware enhancements derived strictly from actual device telemetry and usage patterns.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {data.hardwareRecommendations.map((hw) => (
                <div
                  key={hw.id}
                  className="flex flex-col justify-between rounded-lg border border-slate-200 bg-slate-50/50 p-4 text-xs gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-900">{hw.title}</span>
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          hw.urgency === 'high'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : hw.urgency === 'medium'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {hw.component}
                      </span>
                    </div>
                    <div className="rounded bg-white p-2.5 border border-slate-200 text-slate-600 mb-2 leading-relaxed">
                      <strong className="text-slate-800 block text-[11px] mb-0.5">Reason:</strong>
                      {hw.reason}
                    </div>
                    <p className="text-slate-800 font-medium leading-relaxed">{hw.recommendation}</p>
                  </div>

                  {hw.url ? (
                    <a
                      href={hw.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex justify-center rounded border border-slate-300 bg-white px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      View Product Details
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 5: LEARNING RESOURCES */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col gap-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">LEARNING & DOCUMENTATION RESOURCES</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Official documentation and guides curated for your detected active programming stack.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {data.learningResources.map((lr) => (
                <div
                  key={lr.id}
                  className="flex flex-col justify-between rounded-lg border border-slate-200 bg-slate-50/50 p-4 text-xs gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                        {lr.category}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">{lr.source}</span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-xs">{lr.title}</h4>
                    <p className="text-slate-600 text-[11px] mt-1 leading-relaxed">{lr.description}</p>
                  </div>
                  <a
                    href={lr.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex justify-center rounded bg-slate-900 px-3 py-1.5 font-bold text-white hover:bg-slate-800 transition-colors"
                  >
                    {lr.actionText}
                  </a>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 6: DEVICE / PERFORMANCE EDUCATIONAL GUIDES */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col gap-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">PERFORMANCE & THERMAL GUIDES</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Official technical references addressing conditions detected in your device telemetry.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {data.performanceResources.map((pr) => (
                <div
                  key={pr.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 text-xs"
                >
                  <div className="flex flex-col gap-1 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{pr.title}</span>
                      <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                        {pr.detectedCondition}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">{pr.description}</p>
                  </div>
                  <a
                    href={pr.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded border border-slate-300 bg-white px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    Read Guide
                  </a>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
