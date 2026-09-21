import { useEffect, useState, useRef } from 'react';
import type {
  AppImpactAnalysis,
  AppProfile,
  AppSessionAnalysis,
  ImpactRating,
  PlayStoreApp,
  TelemetrySample,
  InstalledAppItem,
} from '../types';
import { SAMPLE_APPS, analyzeAppImpact, analyzePlayStoreAppImpact } from '../services/appImpactService';
import { generateAppRecommendations } from '../services/recommendationService';
import { apiClient } from '../services/apiClient';

interface Props {
  telemetry: TelemetrySample;
}

export function AppAnalyzerPage({ telemetry }: Props) {
  // Top level tab mode: 'what_if' | 'installed'
  const [activeTab, setActiveTab] = useState<'what_if' | 'installed'>('what_if');

  // MODE 1 — WHAT IF I INSTALL? (PLAY STORE SEARCH)
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [playResults, setPlayResults] = useState<PlayStoreApp[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [selectedPlayApp, setSelectedPlayApp] = useState<PlayStoreApp | null>(null);

  // Fallback sample apps
  const [fallbackApps, setFallbackApps] = useState<AppProfile[]>(SAMPLE_APPS);
  const [selectedFallbackAppId, setSelectedFallbackAppId] = useState<string>(SAMPLE_APPS[0].id);

  // Mode 1 Prediction Result
  const [predictionResult, setPredictionResult] = useState<AppImpactAnalysis | null>(null);

  // MODE 2 — ANALYZE INSTALLED APP (WINDOWS REGISTRY INSTALLED APPS)
  const [installedApps, setInstalledApps] = useState<InstalledAppItem[]>([]);
  const [installedSearchTerm, setInstalledSearchTerm] = useState<string>('');
  const [selectedInstalledApp, setSelectedInstalledApp] = useState<InstalledAppItem | null>(null);
  const [isLoadingInstalled, setIsLoadingInstalled] = useState<boolean>(true);

  // Mode 2 Session State
  const activeApps = telemetry.activeApps || [];
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [sessionDuration, setSessionDuration] = useState<number>(0);
  const [sessionSamples, setSessionSamples] = useState<
    Array<{ cpu: number; ramMb: number; battery: number | null; temp: number | null }>
  >([]);
  const [completedSession, setCompletedSession] = useState<AppSessionAnalysis | null>(null);
  const timerRef = useRef<any>(null);

  // Load installed apps from backend API / telemetry
  useEffect(() => {
    let mounted = true;
    const fetchInstalled = async () => {
      try {
        const apps = await apiClient.getInstalledApps();
        if (mounted && apps.length > 0) {
          setInstalledApps(apps);
          if (!selectedInstalledApp) {
            setSelectedInstalledApp(apps[0]);
          }
        } else if (mounted && telemetry.installedApps && telemetry.installedApps.length > 0) {
          setInstalledApps(telemetry.installedApps);
          if (!selectedInstalledApp) {
            setSelectedInstalledApp(telemetry.installedApps[0]);
          }
        }
      } catch {
        if (mounted && telemetry.installedApps) {
          setInstalledApps(telemetry.installedApps);
        }
      } finally {
        if (mounted) setIsLoadingInstalled(false);
      }
    };

    fetchInstalled();
    const interval = setInterval(fetchInstalled, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Sync isRunning status for installed apps with current active processes
  const activeAppNamesLower = activeApps.map((a) => a.name.toLowerCase());
  const listWithRunningStatus = installedApps.map((app) => {
    const nameLower = app.name.toLowerCase();
    const isRunning = activeAppNamesLower.some((active) => {
      if (nameLower.includes(active) || active.includes(nameLower)) return true;
      if (active.includes('chrome') && nameLower.includes('chrome')) return true;
      if (active.includes('edge') && (nameLower.includes('edge') || nameLower.includes('microsoft edge'))) return true;
      if (active.includes('code') && (nameLower.includes('visual studio code') || nameLower.includes('vscode'))) return true;
      if (active.includes('spotify') && nameLower.includes('spotify')) return true;
      if (active.includes('discord') && nameLower.includes('discord')) return true;
      if (active.includes('node') && nameLower.includes('node')) return true;
      if (active.includes('python') && nameLower.includes('python')) return true;
      return false;
    });

    return {
      ...app,
      isRunning,
    };
  });

  // Filter installed apps by search term
  const filteredInstalledApps = listWithRunningStatus.filter(
    (app) =>
      app.name.toLowerCase().includes(installedSearchTerm.trim().toLowerCase()) ||
      (app.publisher && app.publisher.toLowerCase().includes(installedSearchTerm.trim().toLowerCase()))
  );

  // Auto select active installed app if none selected
  const activeSelectedApp =
    filteredInstalledApps.find((a) => a.name === selectedInstalledApp?.name) ||
    filteredInstalledApps[0] ||
    selectedInstalledApp ||
    null;

  // Load backend app profiles fallback for Mode 1
  useEffect(() => {
    apiClient.getAppProfiles().then((loadedApps) => {
      if (loadedApps && loadedApps.length > 0) {
        setFallbackApps(loadedApps);
        setSelectedFallbackAppId(loadedApps[0].id);
      }
    });
  }, []);

  // Debounced Google Play Store Search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setPlayResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await apiClient.searchPlayStoreApps(searchTerm);
        setPlayResults(results);
        if (results.length > 0) {
          setSelectedPlayApp(results[0]);
          setPredictionResult(null);
        } else {
          setSelectedPlayApp(null);
        }
      } catch {
        setPlayResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const selectedFallbackApp =
    fallbackApps.find((app) => app.id === selectedFallbackAppId) || fallbackApps[0] || null;

  // Handle Mode 1 Predict Impact
  const handlePredictImpact = () => {
    if (selectedPlayApp) {
      const result = analyzePlayStoreAppImpact(selectedPlayApp, telemetry);
      setPredictionResult(result);
      apiClient.postPrediction(result).catch(() => {});
    } else if (selectedFallbackApp) {
      const result = analyzeAppImpact(selectedFallbackApp, telemetry);
      setPredictionResult(result);
      apiClient.postPrediction(result).catch(() => {});
    }
  };

  // Handle Mode 2 Start Session
  const handleStartSession = () => {
    if (!activeSelectedApp) return;
    setIsSessionActive(true);
    setSessionStartTime(Date.now());
    setSessionDuration(0);
    setCompletedSession(null);

    const matchingProcess = activeApps.find(
      (a) => a.name.toLowerCase().includes(activeSelectedApp.name.toLowerCase()) || activeSelectedApp.name.toLowerCase().includes(a.name.toLowerCase())
    );

    const initialSample = {
      cpu: matchingProcess?.cpuPercent ?? telemetry.cpuUsage,
      ramMb: matchingProcess?.ramMb ?? ((telemetry.ramUsage / 100) * 8192),
      battery: telemetry.batteryLevel,
      temp: telemetry.temperature,
    };
    setSessionSamples([initialSample]);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSessionDuration((prev) => prev + 1);
    }, 1000);
  };

  // Poll samples during active session
  useEffect(() => {
    if (!isSessionActive || !activeSelectedApp) return;

    const matchingProcess = activeApps.find(
      (a) => a.name.toLowerCase().includes(activeSelectedApp.name.toLowerCase()) || activeSelectedApp.name.toLowerCase().includes(a.name.toLowerCase())
    );

    const newSample = {
      cpu: matchingProcess?.cpuPercent ?? telemetry.cpuUsage,
      ramMb: matchingProcess?.ramMb ?? ((telemetry.ramUsage / 100) * 8192),
      battery: telemetry.batteryLevel,
      temp: telemetry.temperature,
    };

    setSessionSamples((prev) => [...prev, newSample]);
  }, [telemetry]);

  // Handle Mode 2 Stop Session
  const handleStopSession = () => {
    if (!isSessionActive || !activeSelectedApp) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsSessionActive(false);

    if (sessionSamples.length === 0) return;

    const cpus = sessionSamples.map((s) => s.cpu);
    const rams = sessionSamples.map((s) => s.ramMb);

    const avgCpu = Math.round((cpus.reduce((a, b) => a + b, 0) / cpus.length) * 10) / 10;
    const peakCpu = Math.round(Math.max(...cpus) * 10) / 10;

    const avgRamMb = Math.round((rams.reduce((a, b) => a + b, 0) / rams.length) * 10) / 10;
    const peakRamMb = Math.round(Math.max(...rams) * 10) / 10;

    const batteryStart = sessionSamples[0].battery;
    const batteryEnd = sessionSamples[sessionSamples.length - 1].battery;

    const tempStart = sessionSamples[0].temp;
    const tempEnd = sessionSamples[sessionSamples.length - 1].temp;

    const sessionData: AppSessionAnalysis = {
      appName: activeSelectedApp.name,
      startTime: sessionStartTime || Date.now(),
      endTime: Date.now(),
      durationSeconds: sessionDuration,
      avgCpuPercent: avgCpu,
      peakCpuPercent: peakCpu,
      avgRamMb: avgRamMb,
      peakRamMb: peakRamMb,
      batteryStart,
      batteryEnd,
      tempStart,
      tempEnd,
    };

    setCompletedSession(sessionData);
    apiClient.postAppSession(sessionData).catch(() => {});
  };

  const recommendations = predictionResult
    ? generateAppRecommendations(predictionResult, telemetry)
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

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return mins > 0 ? `${mins}m ${s}s` : `${s}s`;
  };

  const formatRamString = (mb: number) => {
    if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
    return `${Math.round(mb)} MB`;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header & Mode Switcher Tabs */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">App Performance Analyzer</h2>
            <p className="mt-1 text-xs text-slate-500">
              Predict performance impact before installation or analyze actual resource usage of installed apps.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex rounded-lg bg-slate-100 p-1 border border-slate-200">
            <button
              onClick={() => setActiveTab('what_if')}
              className={`rounded-md px-3.5 py-1.5 text-xs font-bold transition-all ${
                activeTab === 'what_if'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🔍 What If I Install?
            </button>
            <button
              onClick={() => setActiveTab('installed')}
              className={`rounded-md px-3.5 py-1.5 text-xs font-bold transition-all ${
                activeTab === 'installed'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ⚡ Analyze Installed App
            </button>
          </div>
        </div>
      </div>

      {/* MODE 1 — WHAT IF I INSTALL? */}
      {activeTab === 'what_if' ? (
        <div className="grid gap-4 md:grid-cols-12">
          {/* Left Column: Real Google Play Store Search */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Search Google Play Store
                </label>
                <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  Real Play Store Metadata
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">
                Search any Android/mobile app (e.g. WhatsApp, Spotify, BGMI, Genshin) to fetch live Play Store metadata.
              </p>

              <div className="relative mb-3">
                <input
                  type="text"
                  placeholder="Type app name to search Play Store..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-xs focus:border-indigo-500 focus:outline-none pr-8"
                />
                {isSearching ? (
                  <div className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                ) : null}
              </div>

              {/* Play Store Search Results */}
              {playResults.length > 0 ? (
                <div className="mb-4 flex flex-col gap-1.5 max-h-48 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-1.5">
                  {playResults.map((app) => (
                    <button
                      key={app.appId}
                      onClick={() => {
                        setSelectedPlayApp(app);
                        setPredictionResult(null);
                      }}
                      className={`flex items-center gap-2.5 rounded-md p-2 text-left transition-colors ${
                        selectedPlayApp?.appId === app.appId
                          ? 'bg-indigo-600 text-white'
                          : 'hover:bg-slate-200/70 text-slate-800'
                      }`}
                    >
                      {app.icon ? (
                        <img src={app.icon} alt="" className="h-7 w-7 rounded-md object-cover flex-shrink-0" />
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-300 text-xs font-bold text-slate-700 flex-shrink-0">
                          📱
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-xs truncate">{app.title}</div>
                        <div className={`text-[10px] truncate ${selectedPlayApp?.appId === app.appId ? 'text-indigo-100' : 'text-slate-500'}`}>
                          {app.developer || app.genre || 'Play Store App'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchTerm && !isSearching ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-center text-xs font-medium text-amber-800 mb-3">
                  No Play Store app found matching "{searchTerm}". Showing fallback local profiles below.
                </div>
              ) : null}

              {/* Fallback Local App Profiles when search is empty */}
              {!searchTerm ? (
                <div className="mb-3">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Or Select Preset App Profile
                  </label>
                  <select
                    value={selectedFallbackAppId}
                    onChange={(e) => {
                      setSelectedFallbackAppId(e.target.value);
                      setSelectedPlayApp(null);
                      setPredictionResult(null);
                    }}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-xs focus:border-indigo-500 focus:outline-none"
                  >
                    {fallbackApps.map((app) => (
                      <option key={app.id} value={app.id}>
                        {app.name} ({app.sizeMB >= 1024 ? `${(app.sizeMB / 1024).toFixed(1)} GB` : `${app.sizeMB} MB`})
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {/* Selected App Details Card */}
              {selectedPlayApp ? (
                <div className="rounded-lg bg-slate-50 p-4 border border-slate-200 text-xs flex flex-col gap-2">
                  <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
                    {selectedPlayApp.icon ? (
                      <img src={selectedPlayApp.icon} alt="" className="h-10 w-10 rounded-lg object-cover shadow-xs" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 text-base font-bold">
                        📱
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-slate-900 text-sm truncate">{selectedPlayApp.title}</h3>
                      <p className="text-slate-500 text-[11px] truncate">
                        Developer: <strong className="text-slate-700">{selectedPlayApp.developer || 'Unavailable'}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="text-slate-500">Category:</span>
                      <span className="font-semibold text-slate-800">{selectedPlayApp.genre || 'Unavailable'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="text-slate-500">Rating:</span>
                      <span className="font-semibold text-slate-800">
                        {selectedPlayApp.scoreText ? `⭐ ${selectedPlayApp.scoreText}` : 'Unavailable'}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="text-slate-500">Downloads:</span>
                      <span className="font-semibold text-slate-800">{selectedPlayApp.installs || 'Unavailable'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="text-slate-500">App Size:</span>
                      <span className="font-semibold text-slate-800">{selectedPlayApp.size || 'Unavailable'}</span>
                    </div>
                    <div className="flex justify-between col-span-2">
                      <span className="text-slate-500">Version:</span>
                      <span className="font-semibold text-slate-800">{selectedPlayApp.version || 'Unavailable'}</span>
                    </div>
                  </div>

                  {selectedPlayApp.summary || selectedPlayApp.description ? (
                    <div className="mt-1 pt-2 border-t border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Description</span>
                      <p className="text-slate-600 line-clamp-2 text-[11px]">
                        {selectedPlayApp.summary || selectedPlayApp.description}
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-1 rounded bg-amber-50 p-2 text-[10px] text-amber-800 font-medium border border-amber-200">
                    ℹ️ Play Store metadata is input metadata, not actual resource requirements. Missing fields display <strong>Unavailable</strong>.
                  </div>
                </div>
              ) : selectedFallbackApp ? (
                <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-200 text-xs flex flex-col gap-2">
                  <div className="font-semibold text-slate-900 border-b border-slate-200 pb-1.5">
                    {selectedFallbackApp.name}
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500">Category:</span>
                    <span className="font-medium text-slate-800">{selectedFallbackApp.category}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500">App Size:</span>
                    <span className="font-medium text-slate-800">
                      {selectedFallbackApp.sizeMB >= 1024 ? `${(selectedFallbackApp.sizeMB / 1024).toFixed(1)} GB` : `${selectedFallbackApp.sizeMB} MB`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">CPU Intensity:</span>
                    <span className="font-semibold uppercase text-indigo-600">{selectedFallbackApp.cpuIntensity}</span>
                  </div>
                </div>
              ) : null}
            </div>

            <button
              onClick={handlePredictImpact}
              disabled={!selectedPlayApp && !selectedFallbackApp}
              className="mt-4 w-full rounded-md bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              Predict Performance Impact 🎯
            </button>
          </div>

          {/* Right Column: Device State & Predicted Impact */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-7">
            {/* Device State */}
            <div className="mb-3 rounded-lg bg-slate-100 p-3 text-xs border border-slate-200">
              <h4 className="font-semibold text-slate-800 mb-1.5 uppercase text-[10px] tracking-wider">
                Current Device State (Windows Laptop)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-slate-700 font-medium text-[11px]">
                <div>RAM: <span className="font-bold text-slate-900">{telemetry.ramUsed && telemetry.ramTotal ? `${telemetry.ramUsed.toFixed(1)}/${telemetry.ramTotal.toFixed(1)} GB` : `${telemetry.ramUsage}%`}</span></div>
                <div>CPU: <span className="font-bold text-slate-900">{telemetry.cpuUsage.toFixed(0)}%</span></div>
                <div>Storage: <span className="font-bold text-slate-900">{telemetry.storageAvailable !== undefined && telemetry.storageAvailable !== null ? `${telemetry.storageAvailable.toFixed(1)} GB free` : `${(100 - telemetry.storageUsage).toFixed(0)}% free`}</span></div>
                <div>Battery: <span className="font-bold text-slate-900">{telemetry.batteryLevel !== null && telemetry.batteryLevel !== undefined ? `${telemetry.batteryLevel}%` : 'Unavailable'}</span></div>
                <div>Temp: <span className="font-bold text-slate-900">{telemetry.temperature !== null && telemetry.temperature !== undefined ? `${telemetry.temperature.toFixed(1)}°C` : 'Unavailable'}</span></div>
              </div>
            </div>

            {predictionResult && recommendations ? (
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-xs text-slate-500">Target: {predictionResult.app.name}</span>
                    <h4 className="text-sm font-bold text-slate-900">Predicted / Estimated Impact</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-semibold">Predicted Impact:</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${overallBadgeBg(predictionResult.overallImpact)}`}>
                      {predictionResult.overallImpact}
                    </span>
                  </div>
                </div>

                {/* Impact Breakdown Grid */}
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5 text-center">
                  <div className="rounded border bg-slate-50 p-2 text-xs">
                    <div className="text-[10px] text-slate-400 font-medium uppercase">RAM</div>
                    <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold border ${impactBadgeColor(predictionResult.ramImpact)}`}>
                      {predictionResult.ramImpact}
                    </span>
                  </div>
                  <div className="rounded border bg-slate-50 p-2 text-xs">
                    <div className="text-[10px] text-slate-400 font-medium uppercase">CPU</div>
                    <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold border ${impactBadgeColor(predictionResult.cpuImpact)}`}>
                      {predictionResult.cpuImpact}
                    </span>
                  </div>
                  <div className="rounded border bg-slate-50 p-2 text-xs">
                    <div className="text-[10px] text-slate-400 font-medium uppercase">Storage</div>
                    <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold border ${impactBadgeColor(predictionResult.storageImpact)}`}>
                      {predictionResult.storageImpact}
                    </span>
                  </div>
                  <div className="rounded border bg-slate-50 p-2 text-xs">
                    <div className="text-[10px] text-slate-400 font-medium uppercase">Battery</div>
                    <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold border ${impactBadgeColor(predictionResult.batteryImpact)}`}>
                      {predictionResult.batteryImpact}
                    </span>
                  </div>
                  <div className="rounded border bg-slate-50 p-2 text-xs col-span-2 sm:col-span-1">
                    <div className="text-[10px] text-slate-400 font-medium uppercase">Thermal</div>
                    <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold border ${impactBadgeColor(predictionResult.thermalImpact)}`}>
                      {predictionResult.thermalImpact}
                    </span>
                  </div>
                </div>

                {/* Recommendations Rationale */}
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
              <div className="flex h-full flex-col items-center justify-center py-10 text-center">
                <div className="rounded-full bg-indigo-100 p-3 text-indigo-600 mb-2 text-lg font-bold">
                  🎯
                </div>
                <p className="text-xs font-bold text-slate-800">Ready to Predict App Performance</p>
                <p className="mt-1 text-[11px] text-slate-500 max-w-xs">
                  Search a Play Store app or select a profile and click "Predict Performance Impact" to test against current device state.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* MODE 2 — ANALYZE INSTALLED APP (WINDOWS INSTALLED APPLICATIONS) */}
      {activeTab === 'installed' ? (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-12">
            {/* Left Column: Windows Installed Applications List & Search */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-bold text-slate-900">Windows Installed Applications</h3>
                  <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    {filteredInstalledApps.length} Apps
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  Scanned from Windows Registry (HKLM/HKCU). Installed apps remain visible whether running or not.
                </p>

                {/* Installed App Search Box */}
                <div className="mb-3">
                  <input
                    type="text"
                    placeholder="Search installed apps by name or publisher..."
                    value={installedSearchTerm}
                    onChange={(e) => setInstalledSearchTerm(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 shadow-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Installed Applications Scroll List */}
                {isLoadingInstalled ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    Scanning Windows registry for installed applications...
                  </div>
                ) : filteredInstalledApps.length > 0 ? (
                  <div className="mb-4 flex flex-col gap-1.5 max-h-72 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-1.5">
                    {filteredInstalledApps.map((app) => {
                      const isSelected = activeSelectedApp?.name === app.name;
                      return (
                        <button
                          key={app.name}
                          onClick={() => {
                            setSelectedInstalledApp(app);
                            setCompletedSession(null);
                          }}
                          className={`flex items-center justify-between rounded-md p-2.5 text-left transition-colors ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'hover:bg-slate-200/70 text-slate-800'
                          }`}
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="font-semibold text-xs truncate" title={app.name}>
                              {app.name}
                            </div>
                            <div className={`text-[10px] truncate ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                              {app.publisher || 'Unknown Publisher'}
                            </div>
                          </div>
                          <div>
                            {app.isRunning ? (
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                isSelected ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              }`}>
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                ● Running
                              </span>
                            ) : (
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                isSelected ? 'bg-indigo-500/60 text-indigo-100' : 'bg-slate-200 text-slate-600'
                              }`}>
                                ○ Not Running
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-center text-xs text-amber-800 mb-4">
                    No installed apps found matching "{installedSearchTerm}".
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Selected App Overview & Monitoring Session Controller */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-7">
              {activeSelectedApp ? (
                <div className="flex flex-col justify-between h-full">
                  <div>
                    {/* App Overview Header */}
                    <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-3 mb-3 gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900">{activeSelectedApp.name}</h3>
                          {activeSelectedApp.isRunning ? (
                            <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-300">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                              ● Running
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200">
                              ○ Not Running
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Publisher: <strong className="text-slate-700">{activeSelectedApp.publisher || 'Unknown Publisher'}</strong> · Version: <strong className="text-slate-700">{activeSelectedApp.version || 'Unavailable'}</strong>
                        </p>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded">
                        Installed on Windows
                      </span>
                    </div>

                    {/* Session Controls Box */}
                    <div className="rounded-lg bg-slate-50 p-4 border border-slate-200 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Resource Analysis Session</span>
                        {isSessionActive ? (
                          <span className="flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 animate-pulse">
                            🔴 Session Recording...
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-slate-400">Idle</span>
                        )}
                      </div>

                      <div className="text-2xl font-black text-slate-900 mb-1 tracking-tight">
                        {formatSeconds(sessionDuration)}
                      </div>

                      {/* Dynamic Guidance for Running vs Not Running */}
                      {activeSelectedApp.isRunning ? (
                        <p className="text-xs text-slate-600 mb-3 bg-emerald-50/80 p-2.5 rounded border border-emerald-100 font-medium">
                          ⚡ <strong>{activeSelectedApp.name}</strong> is currently active on your laptop! Click <strong>"Analyze Running App"</strong> to measure live CPU %, RAM (MB/GB), battery, and thermal impact.
                        </p>
                      ) : (
                        <p className="text-xs text-slate-600 mb-3 bg-amber-50/80 p-2.5 rounded border border-amber-200/70 font-medium">
                          💡 <strong>Instructions:</strong> Launch and open <strong>{activeSelectedApp.name}</strong> on your laptop now. Click <strong>"Start App Analysis"</strong> and use the app normally—the copilot will measure its process metrics as soon as it runs.
                        </p>
                      )}

                      {isSessionActive ? (
                        <button
                          onClick={handleStopSession}
                          className="w-full rounded-md bg-rose-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-rose-700 active:scale-[0.99] transition-all"
                        >
                          Stop Analysis ⏹️
                        </button>
                      ) : activeSelectedApp.isRunning ? (
                        <button
                          onClick={handleStartSession}
                          className="w-full rounded-md bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-[0.99] transition-all"
                        >
                          Analyze Running App ⚡
                        </button>
                      ) : (
                        <button
                          onClick={handleStartSession}
                          className="w-full rounded-md bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 active:scale-[0.99] transition-all"
                        >
                          Start App Analysis ▶️
                        </button>
                      )}
                    </div>

                    {/* Observed Usage Display */}
                    {completedSession ? (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Completed Session</span>
                            <h4 className="font-bold text-slate-900 text-sm">{completedSession.appName}</h4>
                          </div>
                          <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">
                            Duration: {formatSeconds(completedSession.durationSeconds)}
                          </span>
                        </div>

                        {/* Observed Metrics Grid */}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-center">
                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Average CPU</div>
                            <div className="text-base font-black text-slate-900 mt-0.5">{completedSession.avgCpuPercent}%</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">Peak: {completedSession.peakCpuPercent}%</div>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Average RAM</div>
                            <div className="text-base font-black text-slate-900 mt-0.5">{formatRamString(completedSession.avgRamMb)}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">Peak: {formatRamString(completedSession.peakRamMb)}</div>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Battery Change</div>
                            <div className="text-sm font-bold text-slate-900 mt-1">
                              {completedSession.batteryStart !== null && completedSession.batteryEnd !== null
                                ? `${completedSession.batteryStart}% → ${completedSession.batteryEnd}%`
                                : 'Unavailable'}
                            </div>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Temperature</div>
                            <div className="text-sm font-bold text-slate-900 mt-1">
                              {completedSession.tempStart !== null && completedSession.tempEnd !== null
                                ? `${completedSession.tempStart}°C → ${completedSession.tempEnd}°C`
                                : 'Unavailable'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : isSessionActive ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50 rounded-lg border border-slate-200">
                        <div className="h-7 w-7 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent mb-2" />
                        <p className="text-xs font-bold text-slate-800">Measuring resource usage for {activeSelectedApp.name}...</p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {sessionSamples.length} telemetry samples recorded.
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center py-10 text-center">
                  <div className="rounded-full bg-slate-100 p-3 text-slate-400 mb-2 text-lg font-bold">
                    📱
                  </div>
                  <p className="text-xs font-bold text-slate-700">Select an Installed App</p>
                  <p className="mt-1 text-[11px] text-slate-400 max-w-xs">
                    Choose any Windows application installed on your laptop from the list on the left.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* PREDICTED VS ACTUAL COMPARISON SECTION */}
          {completedSession ? (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm mt-2">
              <div className="border-b border-slate-200 pb-3 mb-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Predicted vs Actual</span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                    Mode 1 vs Mode 2
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Comparison between pre-installation predicted impact vs observed runtime metrics recorded during live session analysis.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">
                      <th className="py-2.5 px-3">Metric</th>
                      <th className="py-2.5 px-3">Predicted Impact (Mode 1)</th>
                      <th className="py-2.5 px-3">Observed Actual Usage (Mode 2)</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    <tr>
                      <td className="py-3 px-3 font-bold text-slate-900">CPU Usage</td>
                      <td className="py-3 px-3">
                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold border ${impactBadgeColor(predictionResult?.cpuImpact || 'MEDIUM')}`}>
                          {predictionResult?.cpuImpact || 'Estimated Medium'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {completedSession.avgCpuPercent}% avg (Peak {completedSession.peakCpuPercent}%)
                      </td>
                      <td className="py-3 px-3 font-semibold text-emerald-700">✓ Measured</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-bold text-slate-900">RAM Usage</td>
                      <td className="py-3 px-3">
                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold border ${impactBadgeColor(predictionResult?.ramImpact || 'MEDIUM')}`}>
                          {predictionResult?.ramImpact || 'Estimated Medium'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {formatRamString(completedSession.avgRamMb)} avg
                      </td>
                      <td className="py-3 px-3 font-semibold text-emerald-700">✓ Measured</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-bold text-slate-900">Battery Impact</td>
                      <td className="py-3 px-3">
                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold border ${impactBadgeColor(predictionResult?.batteryImpact || 'LOW')}`}>
                          {predictionResult?.batteryImpact || 'Estimated Drain'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {completedSession.batteryStart !== null && completedSession.batteryEnd !== null
                          ? `${completedSession.batteryStart}% → ${completedSession.batteryEnd}%`
                          : 'Unavailable'}
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-medium">
                        {completedSession.batteryStart !== null ? '✓ Measured' : 'Unavailable'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-bold text-slate-900">Thermal Output</td>
                      <td className="py-3 px-3">
                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold border ${impactBadgeColor(predictionResult?.thermalImpact || 'LOW')}`}>
                          {predictionResult?.thermalImpact || 'Estimated Normal'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {completedSession.tempStart !== null && completedSession.tempEnd !== null
                          ? `${completedSession.tempStart}°C → ${completedSession.tempEnd}°C`
                          : 'Unavailable'}
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-medium">
                        {completedSession.tempStart !== null ? '✓ Measured' : 'Unavailable'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-3 rounded-lg bg-slate-50 p-3 text-[11px] text-slate-500 border border-slate-200">
                ⚠️ <strong>Empirical Disclaimer:</strong> Short usage sessions provide empirical observations of real-time usage on your device rather than long-term scientific laboratory benchmarks.
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
