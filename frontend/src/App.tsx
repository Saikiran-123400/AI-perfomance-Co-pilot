import { useState } from 'react';
import { Sidebar, type TabType } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { AppAnalyzerPage } from './components/AppAnalyzerPage';
import { PerformancePage } from './components/PerformancePage';
import { CopilotPage } from './components/CopilotPage';
import { HistoryPage } from './components/HistoryPage';
import { SettingsPage } from './components/SettingsPage';
import { OnboardingFlow } from './components/OnboardingFlow';
import { useDashboard } from './services/useDashboard';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [hasOnboarded, setHasOnboarded] = useState<boolean>(() => {
    return localStorage.getItem('ai_copilot_onboarded') === 'true';
  });

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

  const handleCompleteOnboarding = () => {
    localStorage.setItem('ai_copilot_onboarded', 'true');
    setHasOnboarded(true);
  };

  const handleResetOnboarding = () => {
    localStorage.removeItem('ai_copilot_onboarded');
    setHasOnboarded(false);
  };

  if (!hasOnboarded) {
    return (
      <div className="min-h-screen bg-slate-100 p-4 sm:p-6 flex items-center justify-center">
        <OnboardingFlow onComplete={handleCompleteOnboarding} />
      </div>
    );
  }

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
            ) : currentTab === 'copilot' ? (
              <CopilotPage />
            ) : currentTab === 'history' ? (
              <HistoryPage />
            ) : (
              <SettingsPage onResetOnboarding={handleResetOnboarding} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
