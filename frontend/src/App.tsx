import { useState } from 'react';
import { Sidebar, type TabType } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { AppAnalyzerPage } from './components/AppAnalyzerPage';
import { PerformancePage } from './components/PerformancePage';
import { HistoryPage } from './components/HistoryPage';
import { SettingsPage } from './components/SettingsPage';
import { useDashboard } from './services/useDashboard';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const { data } = useDashboard();

  const currentTelemetry = data?.telemetry.latest ?? {
    timestamp: Date.now(),
    cpuUsage: 30,
    ramUsage: 55,
    storageUsage: 64,
    temperature: null,
    batteryLevel: 82,
    batteryDrainRate: 8,
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Persistent Left Sidebar Navigation */}
      <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />

      {/* Main Content View Panel */}
      <div className="flex flex-1 flex-col min-w-0">
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <div className="mx-auto max-w-6xl">
            {currentTab === 'dashboard' ? (
              <Dashboard />
            ) : currentTab === 'analyzer' ? (
              <AppAnalyzerPage telemetry={currentTelemetry} />
            ) : currentTab === 'performance' ? (
              <PerformancePage currentTelemetry={currentTelemetry} />
            ) : currentTab === 'history' ? (
              <HistoryPage />
            ) : (
              <SettingsPage />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
