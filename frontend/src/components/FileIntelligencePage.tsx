import { useState, useEffect } from 'react';
import { apiClient } from '../services/apiClient';
import type {
  StorageOverview,
  DeclutterSummary,
  DuplicateGroup,
  RedundantItem,
  DevProjectCleanup,
  FileItemInfo,
  SmartOrganizationPreview,
  SensitiveFileItem,
  StorageGrowthData,
} from '../types';

type SectionTab = 'overview' | 'duplicates' | 'developer' | 'large_old' | 'organization' | 'sensitive';

export function FileIntelligencePage() {
  const [activeTab, setActiveTab] = useState<SectionTab>('overview');
  const [loading, setLoading] = useState(true);
  const [rescanning, setRescanning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Data States
  const [storage, setStorage] = useState<StorageOverview | null>(null);
  const [declutter, setDeclutter] = useState<DeclutterSummary | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [redundant, setRedundant] = useState<RedundantItem[]>([]);
  const [devProjects, setDevProjects] = useState<DevProjectCleanup[]>([]);
  const [largeFiles, setLargeFiles] = useState<FileItemInfo[]>([]);
  const [oldFiles, setOldFiles] = useState<FileItemInfo[]>([]);
  const [largeSort, setLargeSort] = useState<'size' | 'oldest' | 'recent'>('size');
  const [oldDays, setOldDays] = useState<number>(90);
  const [organization, setOrganization] = useState<SmartOrganizationPreview[]>([]);
  const [sensitive, setSensitive] = useState<SensitiveFileItem[]>([]);
  const [growth, setGrowth] = useState<StorageGrowthData | null>(null);
  const [exclusions, setExclusions] = useState<string[]>([]);
  const [newExclusionPath, setNewExclusionPath] = useState('');

  // Confirmation Modal State
  const [modalAction, setModalAction] = useState<{
    isOpen: boolean;
    type: 'recycle' | 'move';
    title: string;
    description: string;
    targetPaths: string[];
    destinationPath?: string;
  }>({
    isOpen: false,
    type: 'recycle',
    title: '',
    description: '',
    targetPaths: [],
  });

  const [actionProcessing, setActionProcessing] = useState(false);
  const [actionResult, setActionResult] = useState<{ message: string; isError?: boolean } | null>(null);

  const loadData = async () => {
    if (isPaused) return;
    setLoading(true);
    try {
      const [
        storageRes,
        declutterRes,
        duplicatesRes,
        redundantRes,
        devRes,
        largeRes,
        oldRes,
        orgRes,
        sensitiveRes,
        growthRes,
        exclusionsRes,
      ] = await Promise.all([
        apiClient.getFileStorageOverview(),
        apiClient.getFileDeclutterSummary(),
        apiClient.getDuplicates(),
        apiClient.getRedundantFiles(),
        apiClient.getDeveloperProjects(),
        apiClient.getLargeFiles(largeSort),
        apiClient.getOldFiles(oldDays),
        apiClient.getSmartOrganization(),
        apiClient.getSensitiveFiles(),
        apiClient.getStorageGrowth(),
        apiClient.getExclusions(),
      ]);

      setStorage(storageRes);
      setDeclutter(declutterRes);
      setDuplicates(duplicatesRes);
      setRedundant(redundantRes);
      setDevProjects(devRes);
      setLargeFiles(largeRes);
      setOldFiles(oldRes);
      setOrganization(orgRes);
      setSensitive(sensitiveRes);
      setGrowth(growthRes);
      setExclusions(exclusionsRes);
    } catch {
      // Ignore load errors gracefully
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [largeSort, oldDays, isPaused]);

  const handleRescan = async () => {
    setRescanning(true);
    await apiClient.rescanFilesystem();
    await loadData();
    setRescanning(false);
  };

  const handleOpenRecycleModal = (title: string, description: string, paths: string[]) => {
    setActionResult(null);
    setModalAction({
      isOpen: true,
      type: 'recycle',
      title,
      description,
      targetPaths: paths,
    });
  };

  const handleOpenMoveModal = (title: string, currentPath: string, suggestedPath: string) => {
    setActionResult(null);
    setModalAction({
      isOpen: true,
      type: 'move',
      title,
      description: `Move file from current location to suggested folder?`,
      targetPaths: [currentPath],
      destinationPath: suggestedPath,
    });
  };

  const handleConfirmAction = async () => {
    if (modalAction.targetPaths.length === 0) return;
    setActionProcessing(true);
    setActionResult(null);

    const res = await apiClient.executeFileAction(
      modalAction.type,
      modalAction.targetPaths,
      modalAction.destinationPath
    );

    setActionProcessing(false);

    if (res.success) {
      setActionResult({
        message: `Successfully processed ${res.processedCount} item(s). ${
          modalAction.type === 'recycle' ? 'Items sent to Windows Recycle Bin.' : 'File moved successfully.'
        }`,
      });
      setTimeout(() => {
        setModalAction((prev) => ({ ...prev, isOpen: false }));
        loadData();
      }, 1500);
    } else {
      setActionResult({
        message: `Action encountered errors: ${res.errors.join(', ')}`,
        isError: true,
      });
    }
  };

  const handleAddExclusion = async () => {
    if (!newExclusionPath.trim()) return;
    const updated = await apiClient.updateExclusions('add', newExclusionPath.trim());
    setExclusions(updated);
    setNewExclusionPath('');
  };

  const handleRemoveExclusion = async (pathToRemove: string) => {
    const updated = await apiClient.updateExclusions('remove', pathToRemove);
    setExclusions(updated);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Top Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">File Intelligence</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Analyze local Windows laptop storage, discover reclaimable space, exact duplicates, generated build outputs, and sensitive files.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`rounded border px-3 py-1.5 text-xs font-semibold transition-colors ${
              isPaused
                ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            {isPaused ? 'Resume File Analysis' : 'Pause File Analysis'}
          </button>
          <button
            onClick={handleRescan}
            disabled={rescanning || isPaused}
            className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {rescanning ? 'Rescanning...' : 'Rescan Filesystem'}
          </button>
        </div>
      </header>

      {/* Privacy Notice Banner */}
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800">🔒 Privacy Notice:</span>
          <span>File analysis runs locally on your device. Your file contents are never uploaded to AI services.</span>
        </div>
        <span className="text-[11px] font-semibold text-slate-500">Local Inspection Active</span>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
            activeTab === 'overview'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Storage & Declutter
        </button>
        <button
          onClick={() => setActiveTab('duplicates')}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
            activeTab === 'duplicates'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Exact Duplicates ({duplicates.length})
        </button>
        <button
          onClick={() => setActiveTab('developer')}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
            activeTab === 'developer'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Developer Cleanup ({devProjects.length} Projects)
        </button>
        <button
          onClick={() => setActiveTab('large_old')}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
            activeTab === 'large_old'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Large & Old Files
        </button>
        <button
          onClick={() => setActiveTab('organization')}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
            activeTab === 'organization'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Smart Organization ({organization.length})
        </button>
        <button
          onClick={() => setActiveTab('sensitive')}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
            activeTab === 'sensitive'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Sensitive Files ({sensitive.length})
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs font-medium text-slate-500 animate-pulse">
          Analyzing Windows storage and scanning local user directories...
        </div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW & DECLUTTER */}
          {activeTab === 'overview' ? (
            <div className="flex flex-col gap-5">
              {/* Storage Overview Top Card */}
              {storage ? (
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">STORAGE OVERVIEW</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Primary System Drive (C:\)</p>
                    </div>
                    {growth ? (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                          growth.pressureLevel === 'high'
                            ? 'bg-rose-100 text-rose-800 border-rose-200'
                            : growth.pressureLevel === 'moderate'
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {growth.pressureLevel === 'high'
                          ? 'High Storage Pressure'
                          : growth.pressureLevel === 'moderate'
                          ? 'Moderate Pressure'
                          : 'Storage Usage Normal'}
                      </span>
                    ) : null}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-4">
                    <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-200/80">
                      <span className="text-xs font-semibold text-slate-500">Total Storage</span>
                      <p className="text-lg font-bold text-slate-900 mt-1">{storage.totalFormatted}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-200/80">
                      <span className="text-xs font-semibold text-slate-500">Used Storage</span>
                      <p className="text-lg font-bold text-slate-900 mt-1">
                        {storage.usedFormatted} ({storage.usagePercent}%)
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-200/80">
                      <span className="text-xs font-semibold text-slate-500">Free Storage</span>
                      <p className="text-lg font-bold text-emerald-700 mt-1">{storage.freeFormatted}</p>
                    </div>
                    <div className="rounded-lg bg-indigo-50 p-3.5 border border-indigo-100">
                      <span className="text-xs font-semibold text-indigo-900">Reclaimable Space</span>
                      <p className="text-lg font-bold text-indigo-900 mt-1">
                        {declutter?.totalReclaimableFormatted || '0 B'}
                      </p>
                    </div>
                  </div>

                  {/* Storage Progress Bar */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Drive Capacity Used</span>
                      <span className="font-bold text-slate-800">{storage.usagePercent}%</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          storage.usagePercent >= 85
                            ? 'bg-rose-600'
                            : storage.usagePercent >= 75
                            ? 'bg-amber-500'
                            : 'bg-slate-900'
                        }`}
                        style={{ width: `${storage.usagePercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Category Distribution Grid */}
                  <div className="mt-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                      Storage Distribution by Category
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                      {storage.categories.map((cat) => (
                        <div
                          key={cat.category}
                          className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs"
                        >
                          <span className="font-bold text-slate-800">{cat.category}</span>
                          <div className="mt-1 flex justify-between text-slate-600">
                            <span>{cat.formattedSize}</span>
                            <span className="text-slate-400">{cat.fileCount} items</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* AI Digital Declutter Prominent Summary Card */}
              {declutter ? (
                <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/60 to-white p-5 shadow-xs flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-indigo-950">AI DIGITAL DECLUTTER</h3>
                      <p className="text-xs text-indigo-700 mt-0.5">
                        Potentially reclaimable storage detected from real local filesystem analysis.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('duplicates')}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors"
                    >
                      Review Suggestions
                    </button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 text-xs">
                    <div className="rounded-lg border border-indigo-100 bg-white p-3.5">
                      <span className="text-slate-500 font-medium">Duplicate files</span>
                      <p className="text-base font-bold text-slate-900 mt-1">{declutter.duplicateFormatted}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Exact SHA-256 matches</p>
                    </div>
                    <div className="rounded-lg border border-indigo-100 bg-white p-3.5">
                      <span className="text-slate-500 font-medium">Old installers</span>
                      <p className="text-base font-bold text-slate-900 mt-1">{declutter.installersFormatted}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Setup files in Downloads</p>
                    </div>
                    <div className="rounded-lg border border-indigo-100 bg-white p-3.5">
                      <span className="text-slate-500 font-medium">Development artifacts</span>
                      <p className="text-base font-bold text-slate-900 mt-1">{declutter.devArtifactsFormatted}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">node_modules, dist, build</p>
                    </div>
                    <div className="rounded-lg border border-indigo-100 bg-white p-3.5">
                      <span className="text-slate-500 font-medium">Large unused files</span>
                      <p className="text-base font-bold text-slate-900 mt-1">{declutter.largeUnusedFormatted}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Files &gt;100 MB unmodified</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Storage Growth & Pressure Card */}
              {growth ? (
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
                    STORAGE GROWTH & PRESSURE ANALYSIS
                  </h3>

                  <p className="text-xs text-slate-600 mb-4">{growth.pressureMessage}</p>

                  <div className="grid gap-3 sm:grid-cols-4">
                    {growth.history.slice(-4).map((snap, i) => (
                      <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                        <span className="text-slate-500 font-semibold">{snap.date}</span>
                        <p className="text-sm font-bold text-slate-900 mt-1">{snap.usedGb} GB used</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* TAB 2: EXACT DUPLICATES */}
          {activeTab === 'duplicates' ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">EXACT DUPLICATE DETECTION</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Verified using exact SHA-256 content hashing. Filenames do not need to match.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded">
                    Total Duplicate Groups: {duplicates.length}
                  </span>
                </div>

                {duplicates.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No exact duplicate files detected across scanned user directories.
                  </div>
                ) : (
                  <div className="mt-4 flex flex-col gap-4">
                    {duplicates.map((group) => (
                      <div
                        key={group.groupId}
                        className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 flex flex-col gap-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                          <div>
                            <span className="text-xs font-bold text-slate-900">{group.groupId}</span>
                            <span className="ml-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Recoverable: {group.recoverableFormatted}
                            </span>
                            {group.isPossibleDuplicate ? (
                              <span className="ml-2 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                Possible Duplicate
                              </span>
                            ) : null}
                          </div>
                          <button
                            onClick={() =>
                              handleOpenRecycleModal(
                                `Review Duplicate Group (${group.groupId})`,
                                `Select redundant duplicate copy to send to Windows Recycle Bin.`,
                                [group.files[1]?.path || group.files[0]?.path]
                              )
                            }
                            className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Review
                          </button>
                        </div>

                        {/* Duplicate File List Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs text-slate-700">
                            <thead className="bg-slate-100/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                              <tr>
                                <th className="p-2">File Name</th>
                                <th className="p-2">Location Path</th>
                                <th className="p-2">Size</th>
                                <th className="p-2">Modified Date</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {group.files.map((file, i) => (
                                <tr key={i} className="hover:bg-slate-100/50">
                                  <td className="p-2 font-bold text-slate-900">{file.name}</td>
                                  <td className="p-2 font-mono text-[11px] text-slate-600 truncate max-w-xs">
                                    {file.path}
                                  </td>
                                  <td className="p-2">{file.formattedSize}</td>
                                  <td className="p-2 text-slate-500">{file.modifiedFormatted}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* TAB 3: DEVELOPER & REDUNDANT CLEANUP */}
          {activeTab === 'developer' ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
                  DEVELOPER PROJECT CLEANUP
                </h3>

                {devProjects.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No generated developer build output folders detected in scanned directories.
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {devProjects.map((proj) => (
                      <div
                        key={proj.projectName}
                        className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 flex flex-col gap-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                          <div>
                            <span className="text-xs font-bold text-slate-900">Project: {proj.projectName}</span>
                            <span className="ml-2 font-mono text-[11px] text-slate-500">{proj.projectPath}</span>
                          </div>
                          <button
                            onClick={() =>
                              handleOpenRecycleModal(
                                `Review Developer Cleanup (${proj.projectName})`,
                                `Send rebuildable build outputs (${proj.rebuildableFormatted}) for ${proj.projectName} to Recycle Bin?`,
                                proj.artifacts.map((a) => a.path)
                              )
                            }
                            className="rounded border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-900 hover:bg-indigo-100"
                          >
                            Review Cleanup ({proj.rebuildableFormatted})
                          </button>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3 text-xs">
                          <div className="rounded bg-white p-2.5 border border-slate-200">
                            <span className="text-slate-500">Estimated Source Size:</span>
                            <p className="font-bold text-slate-900 mt-0.5">{proj.sourceFormatted}</p>
                          </div>
                          <div className="rounded bg-white p-2.5 border border-slate-200">
                            <span className="text-slate-500">Generated Build Files:</span>
                            <p className="font-bold text-slate-900 mt-0.5">{proj.generatedFormatted}</p>
                          </div>
                          <div className="rounded bg-emerald-50 p-2.5 border border-emerald-200">
                            <span className="text-emerald-900 font-semibold">Potentially Rebuildable:</span>
                            <p className="font-bold text-emerald-900 mt-0.5">{proj.rebuildableFormatted}</p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          {proj.artifacts.map((art) => (
                            <div key={art.id} className="rounded bg-white p-2.5 border border-slate-200 text-xs">
                              <div className="flex justify-between font-bold text-slate-800">
                                <span>{art.name} ({art.formattedSize})</span>
                                <span className="text-indigo-700 font-mono text-[11px]">{art.path}</span>
                              </div>
                              <p className="text-slate-500 mt-1 text-[11px] leading-relaxed">{art.reason}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Other Redundant Files List */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
                  REDUNDANT FILES & INSTALLERS
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-100/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="p-2">Item Name</th>
                        <th className="p-2">Category</th>
                        <th className="p-2">Size</th>
                        <th className="p-2">Why Flagged</th>
                        <th className="p-2">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {redundant.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-2 font-bold text-slate-900">{item.name}</td>
                          <td className="p-2 font-semibold text-slate-600">{item.category}</td>
                          <td className="p-2">{item.formattedSize}</td>
                          <td className="p-2 text-slate-500 text-[11px]">{item.reason}</td>
                          <td className="p-2">
                            <button
                              onClick={() =>
                                handleOpenRecycleModal(
                                  `Review Redundant Item (${item.name})`,
                                  `Send ${item.name} (${item.formattedSize}) to Windows Recycle Bin?`,
                                  [item.path]
                                )
                              }
                              className="rounded border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}

          {/* TAB 4: LARGE & OLD FILES */}
          {activeTab === 'large_old' ? (
            <div className="flex flex-col gap-5">
              {/* Large File Finder Card */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">LARGE FILE FINDER</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Find largest files across accessible user directories (&gt;20 MB).</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500 font-semibold">Sort by:</span>
                    <select
                      value={largeSort}
                      onChange={(e) => setLargeSort(e.target.value as any)}
                      className="rounded border border-slate-300 bg-white px-2.5 py-1 font-semibold text-slate-800"
                    >
                      <option value="size">Largest Size</option>
                      <option value="oldest">Oldest Modified</option>
                      <option value="recent">Recently Modified</option>
                    </select>
                  </div>
                </div>

                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-100/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="p-2">File Name</th>
                        <th className="p-2">Path</th>
                        <th className="p-2">Size</th>
                        <th className="p-2">Category</th>
                        <th className="p-2">Last Modified</th>
                        <th className="p-2">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {largeFiles.map((file, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-2 font-bold text-slate-900">{file.name}</td>
                          <td className="p-2 font-mono text-[11px] text-slate-500 truncate max-w-xs">{file.path}</td>
                          <td className="p-2 font-bold text-slate-800">{file.formattedSize}</td>
                          <td className="p-2 text-slate-600">{file.category}</td>
                          <td className="p-2 text-slate-500">{file.modifiedFormatted}</td>
                          <td className="p-2">
                            <button
                              onClick={() =>
                                handleOpenRecycleModal(
                                  `Review Large File (${file.name})`,
                                  `Send ${file.name} (${file.formattedSize}) to Windows Recycle Bin?`,
                                  [file.path]
                                )
                              }
                              className="rounded border border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Old File Intelligence Card */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">OLD FILE INTELLIGENCE</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Files unmodified over specified time window.</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500 font-semibold">Age Filter:</span>
                    <select
                      value={oldDays}
                      onChange={(e) => setOldDays(parseInt(e.target.value, 10))}
                      className="rounded border border-slate-300 bg-white px-2.5 py-1 font-semibold text-slate-800"
                    >
                      <option value={30}>30 Days</option>
                      <option value={90}>90 Days</option>
                      <option value={180}>6 Months</option>
                      <option value={365}>1 Year</option>
                    </select>
                  </div>
                </div>

                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-100/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="p-2">File Name</th>
                        <th className="p-2">Path</th>
                        <th className="p-2">Size</th>
                        <th className="p-2">Last Modified</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {oldFiles.map((file, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-2 font-bold text-slate-900">{file.name}</td>
                          <td className="p-2 font-mono text-[11px] text-slate-500 truncate max-w-xs">{file.path}</td>
                          <td className="p-2">{file.formattedSize}</td>
                          <td className="p-2 text-slate-500">{file.modifiedFormatted}</td>
                          <td className="p-2 font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px] inline-block">
                            Not modified recently
                          </td>
                          <td className="p-2">
                            <button
                              onClick={() =>
                                handleOpenRecycleModal(
                                  `Review Old File (${file.name})`,
                                  `Send ${file.name} (${file.formattedSize}) to Windows Recycle Bin?`,
                                  [file.path]
                                )
                              }
                              className="rounded border border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}

          {/* TAB 5: SMART FILE ORGANIZATION */}
          {activeTab === 'organization' ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
                  SMART FILE ORGANIZATION PREVIEW
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Proposed logical folder structure based on file category and metadata. Files are NEVER moved automatically.
                </p>

                {organization.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No unorganized files found in Downloads or Desktop requiring re-organization.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {organization.map((preview) => (
                      <div
                        key={preview.id}
                        className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 text-xs flex flex-wrap items-center justify-between gap-3"
                      >
                        <div className="flex flex-col gap-1 max-w-xl">
                          <span className="font-bold text-slate-900">
                            {preview.fileName} ({preview.formattedSize})
                          </span>
                          <div className="font-mono text-[11px] text-slate-500">
                            Current: <span className="text-slate-700">{preview.currentPath}</span>
                          </div>
                          <div className="font-mono text-[11px] text-emerald-800 font-semibold">
                            Suggested: <span>{preview.suggestedPath}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              handleOpenMoveModal(
                                `Approve Organization Move (${preview.fileName})`,
                                preview.currentPath,
                                preview.suggestedPath
                              )
                            }
                            className="rounded bg-emerald-700 px-3 py-1.5 font-bold text-white hover:bg-emerald-800 transition-colors"
                          >
                            Approve Move
                          </button>
                          <button
                            onClick={() =>
                              setOrganization((prev) => prev.filter((p) => p.id !== preview.id))
                            }
                            className="rounded border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-100"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* TAB 6: SENSITIVE FILES & PRIVACY */}
          {activeTab === 'sensitive' ? (
            <div className="flex flex-col gap-5">
              {/* Sensitive File Detection List */}
              <div className="rounded-xl border border-rose-200 bg-rose-50/30 p-5 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-rose-950">SENSITIVE FILE DETECTION</h3>
                    <p className="text-xs text-rose-800 mt-0.5">
                      Identified using safe local metadata matching (.env, credentials, private keys). Contents remain 100% local.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-rose-900 bg-rose-100 px-3 py-1 rounded border border-rose-200">
                    {sensitive.length} Potential Sensitive Items
                  </span>
                </div>

                {sensitive.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No potentially exposed credential or secret files detected in scanned user folders.
                  </div>
                ) : (
                  <div className="mt-4 flex flex-col gap-3">
                    {sensitive.map((s) => (
                      <div
                        key={s.id}
                        className="rounded-lg border border-rose-200 bg-white p-3.5 text-xs flex flex-wrap items-center justify-between gap-3"
                      >
                        <div className="flex flex-col gap-1 max-w-xl">
                          <span className="font-bold text-rose-900">{s.name} ({s.formattedSize})</span>
                          <span className="font-mono text-[11px] text-slate-600 truncate">{s.path}</span>
                          <span className="text-[11px] text-rose-800 font-semibold">{s.reason}</span>
                        </div>
                        <button
                          onClick={() =>
                            handleOpenRecycleModal(
                              `Review Sensitive File (${s.name})`,
                              `Send potentially sensitive file ${s.name} to Windows Recycle Bin?`,
                              [s.path]
                            )
                          }
                          className="rounded border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-900 hover:bg-rose-100"
                        >
                          Review
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Folder Exclusion Manager */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col gap-4">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                  FOLDER EXCLUSION SETTINGS
                </h3>
                <p className="text-xs text-slate-500">
                  Exclude specific directories (e.g. C:\Users\user\Documents\Private) from File Intelligence scanning.
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newExclusionPath}
                    onChange={(e) => setNewExclusionPath(e.target.value)}
                    placeholder="Enter folder path to exclude (e.g. C:\Users\user\Documents\Private)..."
                    className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                  <button
                    onClick={handleAddExclusion}
                    className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
                  >
                    Add Exclusion
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Active Excluded Paths ({exclusions.length})
                  </span>
                  {exclusions.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">No custom folder exclusions configured.</span>
                  ) : (
                    exclusions.map((exPath) => (
                      <div
                        key={exPath}
                        className="flex items-center justify-between rounded bg-slate-50 p-2 text-xs font-mono text-slate-700 border border-slate-200"
                      >
                        <span>{exPath}</span>
                        <button
                          onClick={() => handleRemoveExclusion(exPath)}
                          className="text-rose-600 font-bold hover:underline text-[11px]"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}

      {/* CONFIRMATION ACTION MODAL */}
      {modalAction.isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl flex flex-col gap-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
              {modalAction.title}
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed">{modalAction.description}</p>

            <div className="rounded bg-slate-50 p-3 text-xs border border-slate-200">
              <span className="font-bold text-slate-700 block mb-1">Target Paths:</span>
              <ul className="flex flex-col gap-1 font-mono text-[11px] text-slate-600 max-h-32 overflow-y-auto">
                {modalAction.targetPaths.map((p, i) => (
                  <li key={i}>• {p}</li>
                ))}
              </ul>
            </div>

            {modalAction.destinationPath ? (
              <div className="rounded bg-emerald-50 p-3 text-xs border border-emerald-200">
                <span className="font-bold text-emerald-900 block mb-1">Destination Path:</span>
                <span className="font-mono text-[11px] text-emerald-800">{modalAction.destinationPath}</span>
              </div>
            ) : null}

            {actionResult ? (
              <div
                className={`rounded p-3 text-xs font-semibold ${
                  actionResult.isError ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                {actionResult.message}
              </div>
            ) : null}

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                onClick={() => setModalAction((prev) => ({ ...prev, isOpen: false }))}
                disabled={actionProcessing}
                className="rounded border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={actionProcessing}
                className={`rounded px-4 py-1.5 text-xs font-bold text-white transition-colors disabled:opacity-50 ${
                  modalAction.type === 'recycle' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-700 hover:bg-emerald-800'
                }`}
              >
                {actionProcessing
                  ? 'Executing...'
                  : modalAction.type === 'recycle'
                  ? 'Confirm Send to Recycle Bin'
                  : 'Confirm Move'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
