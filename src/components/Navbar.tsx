import React from 'react';
import {
  LayoutDashboard,
  Search,
  FileText,
  User,
  SlidersHorizontal,
  Play,
  Menu,
  X,
  RefreshCw,
  Sun,
  Moon,
} from 'lucide-react';
import { ScheduleConfig, UserProfile, LlmProviderConfig } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  scheduleConfig?: ScheduleConfig;
  userProfile?: UserProfile;
  llmConfig?: LlmProviderConfig;
  isAgentRunning: boolean;
  onRunAgent: () => void;
  onOpenMobile?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'search', label: 'Job Search', icon: Search },
  { id: 'applications', label: 'Applications', icon: FileText },
  { id: 'profile', label: 'Candidate CV', icon: User },
  { id: 'settings', label: 'Settings', icon: SlidersHorizontal },
];

export const SidebarNav: React.FC<{
  activeTab: string;
  setActiveTab: (tab: string) => void;
  scheduleConfig: ScheduleConfig;
  userProfile: UserProfile;
  llmConfig?: LlmProviderConfig;
  isProviderConnected?: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}> = ({
  activeTab,
  setActiveTab,
  scheduleConfig,
  userProfile,
  llmConfig,
  isProviderConnected,
  mobileOpen,
  onCloseMobile,
}) => {
  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 select-none">
      {/* Brand Wordmark */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <button
          type="button"
          onClick={() => handleSelectTab('dashboard')}
          className="inline-flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 group"
        >
          <span className="w-8 h-8 rounded-lg bg-blue-600 text-white font-display font-bold text-sm flex items-center justify-center shadow-xs group-hover:bg-blue-700 transition-colors">
            A
          </span>
          <span className="font-display font-bold text-lg tracking-tight text-zinc-950 dark:text-zinc-50">
            AutoApply
          </span>
        </button>

        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Primary Sidebar Navigation */}
      <nav aria-label="Primary Navigation" className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 font-semibold shadow-xs'
                  : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/80'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? 'text-blue-400 dark:text-blue-600' : 'text-zinc-400 dark:text-zinc-500'
                }`}
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Sidebar Workspace Footer */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3 shrink-0">
        {llmConfig && (
          <button
            type="button"
            onClick={() => handleSelectTab('settings')}
            className="w-full text-left px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 hover:border-blue-500 transition-colors"
            title="Change AI provider or connect API key"
          >
            <div className="flex items-center justify-between gap-2 text-[11px] font-medium">
              <span className="text-zinc-500 dark:text-zinc-400">Active Model</span>
              {typeof isProviderConnected === 'boolean' && (
                <span
                  className={
                    isProviderConnected
                      ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                      : 'text-amber-700 dark:text-amber-400 font-semibold'
                  }
                >
                  {isProviderConnected ? 'Connected' : 'Add Key'}
                </span>
              )}
            </div>
            <div className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {llmConfig.provider} · {llmConfig.model}
            </div>
          </button>
        )}

        <div className="px-1 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
          {scheduleConfig.enabled
            ? `Schedule · ${scheduleConfig.runTime} (${scheduleConfig.maxAppsPerRun}/run)`
            : 'Schedule · Paused'}
        </div>

        <button
          type="button"
          onClick={() => handleSelectTab('profile')}
          className="w-full text-left px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group"
        >
          <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
            {userProfile.fullName}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{userProfile.email}</div>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Full-Height Sidebar */}
      <aside className="hidden lg:block shrink-0">
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* Mobile Slide-Over Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-zinc-950/50 backdrop-blur-[1px]" onClick={onCloseMobile} />
          <div className="relative z-10 h-full">{sidebarContent}</div>
        </div>
      )}
    </>
  );
};

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isAgentRunning,
  onRunAgent,
  onOpenMobile,
  theme = 'light',
  onToggleTheme,
}) => {
  const currentNav = NAV_ITEMS.find((i) => i.id === activeTab) || NAV_ITEMS[0];

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-5 sm:px-8 lg:px-10 flex items-center justify-between gap-4 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobile}
          aria-label="Open navigation menu"
          className="lg:hidden inline-flex items-center justify-center w-10 h-10 -ml-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className="lg:hidden font-display font-bold text-lg tracking-tight text-zinc-950 dark:text-zinc-50 whitespace-nowrap"
        >
          AutoApply
        </button>

        <span className="lg:hidden text-zinc-300 dark:text-zinc-700">/</span>

        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="hidden lg:inline text-zinc-400 dark:text-zinc-500 font-medium whitespace-nowrap">
            Workspace
          </span>
          <span className="hidden lg:inline text-zinc-300 dark:text-zinc-700">/</span>
          <span className="font-display font-semibold text-base text-zinc-950 dark:text-zinc-50 truncate">
            {currentNav.label}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 shadow-2xs transition-colors whitespace-nowrap shrink-0"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-zinc-600" />
                <span className="hidden sm:inline">Dark</span>
              </>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={onRunAgent}
          disabled={isAgentRunning}
          className={`inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
            isAgentRunning
              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm active:scale-[0.98]'
          }`}
        >
          {isAgentRunning ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Preparing...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Pipeline</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
