import { useState } from 'react';

export type TabType = 'dashboard' | 'analyzer' | 'performance' | 'history' | 'settings';

interface Props {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export function Sidebar({ currentTab, onSelectTab }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const mainNav: { id: TabType; label: string; icon: string; star?: boolean }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'analyzer', label: 'App Analyzer', icon: '🔍', star: true },
    { id: 'performance', label: 'Performance', icon: '📊' },
    { id: 'history', label: 'History', icon: '📜' },
  ];

  const bottomNav: { id: TabType; label: string; icon: string }[] = [
    { id: 'settings', label: 'Settings', icon: '⚙' },
  ];

  const renderNavItem = (item: { id: TabType; label: string; icon: string; star?: boolean }) => {
    const isActive = currentTab === item.id;
    return (
      <button
        key={item.id}
        onClick={() => {
          onSelectTab(item.id);
          setMobileOpen(false);
        }}
        className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs font-semibold transition-all ${
          isActive
            ? 'bg-indigo-50 text-indigo-700 shadow-2xs border border-indigo-100/80 font-bold'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-base">{item.icon}</span>
          <span>{item.label}</span>
        </div>
        {item.star ? (
          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
            Core ⭐
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <>
      {/* Mobile Top Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white p-3.5 md:hidden sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-black text-xs">
            ⚡
          </div>
          <span className="font-bold text-slate-900 text-sm">AI Performance Copilot</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100"
        >
          {mobileOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-xs md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      {/* Main Persistent Desktop Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col justify-between border-r border-slate-200 bg-white p-4 transition-transform duration-200 md:static md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4 px-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-base shadow-sm">
              ⚡
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-slate-900 tracking-tight leading-snug">
                AI Performance
              </h1>
              <p className="text-[11px] font-medium text-slate-500">Copilot Desktop</p>
            </div>
          </div>

          {/* Main Navigation Items */}
          <div className="flex flex-col gap-1">
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Navigation
            </span>
            {mainNav.map(renderNavItem)}
          </div>
        </div>

        {/* Bottom Section / Settings */}
        <div className="border-t border-slate-100 pt-3 flex flex-col gap-1">
          <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            System
          </span>
          {bottomNav.map(renderNavItem)}

          {/* Footer Telemetry Badge */}
          <div className="mt-3 rounded-lg bg-slate-50 p-2.5 border border-slate-200/80 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Windows Agent Live
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Polling interval: 5s</p>
          </div>
        </div>
      </aside>
    </>
  );
}
