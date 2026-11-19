import React from 'react';
import { 
  Bot, 
  Search, 
  FileText, 
  UserCheck, 
  Sliders, 
  Github, 
  Play, 
  Clock, 
  Sparkles,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { ScheduleConfig } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  scheduleConfig: ScheduleConfig;
  isAgentRunning: boolean;
  onRunAgent: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  scheduleConfig,
  isAgentRunning,
  onRunAgent
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Agent Dashboard', icon: Bot },
    { id: 'search', label: 'Job Match Engine', icon: Search },
    { id: 'applications', label: 'Applications Log', icon: FileText },
    { id: 'profile', label: 'Base CV & Profile', icon: UserCheck },
    { id: 'settings', label: 'Schedule & Filters', icon: Sliders },
    { id: 'github_tools', label: 'GitHub Open-Source Hub', icon: Github },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Agent Identity */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-500 to-cyan-400 p-0.5 shadow-md shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Bot className="w-5 h-5 text-cyan-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                  AutoApply AI
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                  Autonomous Agent
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Indeed & Career Portal Automation
              </p>
            </div>
          </div>

          {/* Schedule Status & Primary Run Action */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-300 font-medium">Schedule:</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {scheduleConfig.enabled ? `Daily at ${scheduleConfig.runTime}` : 'Paused'}
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400">{scheduleConfig.maxAppsPerRun} apps/run</span>
            </div>

            <button
              onClick={onRunAgent}
              disabled={isAgentRunning}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold shadow-md transition-all duration-200 ${
                isAgentRunning
                  ? 'bg-indigo-600/50 text-indigo-200 cursor-not-allowed border border-indigo-500/40'
                  : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-indigo-600/30 active:scale-95'
              }`}
            >
              {isAgentRunning ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-300" />
                  <span>Agent Executing...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Agent Now</span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 overflow-x-auto no-scrollbar py-2 border-t border-slate-800/80">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
