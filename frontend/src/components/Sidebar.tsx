import { useState } from 'react';

export type TabType = 'dashboard' | 'analyzer' | 'performance' | 'copilot' | 'history' | 'settings';

interface Props {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export function Sidebar({ currentTab, onSelectTab }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const mainNav: { id: TabType; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'analyzer', label: 'App Analyzer' },
    { id: 'performance', label: 'Performance' },
    { id: 'copilot', label: 'Copilot' },
    { id: 'history', label: 'History' },
  ];

  const bottomNav: { id: TabType; label: string }[] = [
    { id: 'settings', label: 'Settings' },
  ];

  const renderNavItem = (item: { id: TabType; label: string }) => {
    const isActive = currentTab === item.id;
    return (
      <button
        key={item.id}
        onClick={() => {
          onSelectTab(item.id);
          setMobileOpen(false);
        }}
        className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
          isActive
            ? 'bg-slate-900 text-white font-bold'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <>
      {/* Mobile Top Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white p-3.5 md:hidden sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-slate-900 text-white font-bold text-xs">
            P
          </div>
          <span className="font-bold text-slate-900 text-sm">AI Performance Copilot</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100"
        >
          {mobileOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      {/* Main Desktop Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col justify-between border-r border-slate-200 bg-white p-4 transition-transform duration-200 md:static md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="border-b border-slate-100 pb-4 mb-4 px-1">
            <h1 className="text-sm font-bold text-slate-900 tracking-tight">
              AI Performance Copilot
            </h1>
            <p className="text-[11px] text-slate-500 mt-0.5">Device Monitoring System</p>
          </div>

          {/* Main Navigation Items */}
          <div className="flex flex-col gap-1">
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Menu
            </span>
            {mainNav.map(renderNavItem)}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-slate-100 pt-3 flex flex-col gap-1">
          <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            System
          </span>
          {bottomNav.map(renderNavItem)}

          {/* Footer Telemetry Status */}
          <div className="mt-3 rounded bg-slate-50 p-2.5 border border-slate-200/80 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5 font-medium text-slate-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Monitoring Active
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Polling interval: 5s</p>
          </div>
        </div>
      </aside>
    </>
  );
}
