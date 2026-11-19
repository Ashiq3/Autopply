import React, { useState } from 'react';
import { 
  Bot, 
  Search, 
  FileText, 
  CheckCircle2, 
  Terminal, 
  ArrowRight, 
  Sparkles, 
  Clock, 
  ShieldCheck, 
  Play,
  Briefcase,
  TrendingUp,
  Download,
  SlidersHorizontal,
  Layers
} from 'lucide-react';
import { JobListing, ApplicationRecord, AgentLog, ScheduleConfig, UserProfile } from '../types';
import { generateResumePDF } from '../utils/pdfGenerator';

interface AgentDashboardProps {
  discoveredJobs: JobListing[];
  applications: ApplicationRecord[];
  agentLogs: AgentLog[];
  scheduleConfig: ScheduleConfig;
  userProfile: UserProfile;
  isAgentRunning: boolean;
  onRunAgent: () => void;
  onNavigateTab: (tab: string) => void;
}

export const AgentDashboard: React.FC<AgentDashboardProps> = ({
  discoveredJobs,
  applications,
  agentLogs,
  scheduleConfig,
  userProfile,
  isAgentRunning,
  onRunAgent,
  onNavigateTab
}) => {
  const [selectedLogFilter, setSelectedLogFilter] = useState<'all' | 'thought' | 'info' | 'success'>('all');

  const filteredLogs = agentLogs.filter(log => {
    if (selectedLogFilter === 'all') return true;
    return log.type === selectedLogFilter;
  });

  const pipelineSteps = [
    { id: 'SEARCH', label: '1. Indeed Search', desc: 'Find Remote / Worldwide Opportunities' },
    { id: 'SCORE', label: '2. Match Scoring', desc: 'Analyze Match & Skill Alignment' },
    { id: 'COMPANY', label: '3. Career Portal', desc: 'Locate Employer Direct Apply Page' },
    { id: 'TAILOR', label: '4. Tailor Resume', desc: 'Generate Custom PDF & Cover Letter' },
    { id: 'MAP', label: '5. Form Auto-Fill', desc: 'Map Non-Voice & Auth Questions' },
    { id: 'SUBMIT', label: '6. Submission', desc: 'Submit & Log Confirmation Record' }
  ];

  return (
    <div className="space-y-5">
      
      {/* Bento Grid Top Section: Overview & Control */}
      <div className="bento-card bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1.5" />
                Active Agent System
              </span>
              <span className="text-xs text-slate-400">Target: Lead Gen • Email Automation • Sheet & AI Agents</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Autonomous Job Search & Application Agent
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
              Searches active 100% remote job listings, filters out cold-calling roles, tailors custom resumes, and submits automated applications.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={() => onNavigateTab('settings')}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center space-x-1.5"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Limit: {scheduleConfig.maxAppsPerRun || 5} Jobs/Run</span>
            </button>

            <button
              onClick={onRunAgent}
              disabled={isAgentRunning}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold text-xs shadow-md transition-all ${
                isAgentRunning
                  ? 'bg-indigo-950 text-indigo-300 border border-indigo-800 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white active:scale-95'
              }`}
            >
              <Play className={`w-3.5 h-3.5 fill-current ${isAgentRunning ? 'animate-spin' : ''}`} />
              <span>{isAgentRunning ? 'Pipeline Executing...' : 'Run Scheduled Agent Search'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bento Grid Row 1: 4 Key Metric Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        
        <div className="bento-tile bg-slate-900 border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Applications Sent</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">{applications.length}</div>
            <span className="text-[11px] text-emerald-400 font-medium">100% Automated Submissions</span>
          </div>
        </div>

        <div className="bento-tile bg-slate-900 border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Discovered Jobs</span>
            <Search className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">{discoveredJobs.length}</div>
            <span className="text-[11px] text-indigo-400 font-medium">Remote & Non-Voice Filtered</span>
          </div>
        </div>

        <div className="bento-tile bg-slate-900 border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Avg Candidate Fit</span>
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">
              {discoveredJobs.length > 0 
                ? Math.round(discoveredJobs.reduce((acc, j) => acc + j.matchScore, 0) / discoveredJobs.length)
                : 96}%
            </div>
            <span className="text-[11px] text-cyan-400 font-medium">High Tech Stack Alignment</span>
          </div>
        </div>

        <div className="bento-tile bg-slate-900 border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Jobs Per Run Limit</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">{scheduleConfig.maxAppsPerRun || 5} Jobs</div>
            <span className="text-[11px] text-amber-400 font-medium">{scheduleConfig.runTime} ({scheduleConfig.frequency})</span>
          </div>
        </div>

      </div>

      {/* Bento Grid Row 2: Live Pipeline Execution & Terminal Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left Bento Module: Pipeline Visualizer */}
        <div className="lg:col-span-5 bento-card bg-slate-900 border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Bot className="w-4 h-4 text-indigo-400" />
              <h2 className="font-bold text-sm text-white">Pipeline Execution Steps</h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
              {isAgentRunning ? 'RUNNING' : 'READY'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {pipelineSteps.map((step, idx) => (
              <div 
                key={step.id} 
                className={`p-2.5 rounded-xl border text-xs space-y-0.5 transition-all ${
                  isAgentRunning 
                    ? 'border-indigo-600/40 bg-indigo-950/20' 
                    : 'border-slate-800 bg-slate-950/50'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-slate-200 text-[11px]">
                  <span>{step.label}</span>
                  <span className="text-[10px] text-slate-500 font-mono">Step 0{idx+1}</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Bento Module: Live Terminal Logs */}
        <div className="lg:col-span-7 bento-card bg-slate-900 border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <h2 className="font-bold text-sm text-white">Agent Execution Logs</h2>
            </div>
            <div className="flex space-x-1">
              {(['all', 'thought', 'info', 'success'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setSelectedLogFilter(f)}
                  className={`px-2 py-0.5 text-[10px] rounded capitalize transition-all ${
                    selectedLogFilter === f
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs h-60 overflow-y-auto space-y-2 text-slate-300">
            {filteredLogs.length === 0 ? (
              <div className="text-slate-500 text-center py-12">
                No logs recorded yet. Click "Run Scheduled Agent Search" to launch!
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div key={log.id} className="space-y-0.5 border-b border-slate-900 pb-1.5 last:border-0">
                  <div className="flex items-center space-x-2 text-[10px]">
                    <span className="text-slate-500">[{log.timestamp}]</span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                      log.type === 'thought' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                      log.type === 'success' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                      log.type === 'error' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                      'bg-slate-800 text-slate-300'
                    }`}>
                      {log.type.toUpperCase()}
                    </span>
                    <span className="text-slate-400 font-medium">[{log.step}]</span>
                  </div>
                  <p className={`text-xs pl-2 border-l-2 ${
                    log.type === 'thought' ? 'border-purple-500 text-purple-200 italic' :
                    log.type === 'success' ? 'border-emerald-500 text-emerald-200' :
                    'border-slate-700 text-slate-300'
                  }`}>
                    {log.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Bento Grid Row 3: Discovered Jobs Bento Cards & Applications Proof */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Recent Discovered Jobs Tile */}
        <div className="lg:col-span-7 bento-card bg-slate-900 border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center space-x-2">
              <Briefcase className="w-4 h-4 text-indigo-400" />
              <h3 className="font-bold text-sm text-white">Discovered Matches (Remote / Non-Voice)</h3>
            </div>
            <button 
              onClick={() => onNavigateTab('search')}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center font-medium"
            >
              View Engine ({discoveredJobs.length}) <ArrowRight className="w-3 h-3 ml-1" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {discoveredJobs.slice(0, 4).map((job) => (
              <div key={job.id} className="bento-tile bg-slate-950/70 border-slate-800 space-y-2">
                <div className="flex items-start justify-between gap-1.5">
                  <h4 className="font-bold text-xs text-slate-100 line-clamp-1">
                    {job.title}
                  </h4>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 shrink-0">
                    {job.matchScore}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">{job.company} • {job.location}</p>

                <div className="flex flex-wrap gap-1">
                  {job.requiredSkills.slice(0, 3).map((s, idx) => (
                    <span key={idx} className="px-1.5 py-0.5 text-[10px] rounded bg-slate-900 text-slate-300 border border-slate-800">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Application Proof Card */}
        <div className="lg:col-span-5 bento-card bg-slate-900 border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-sm text-white">Latest Submitted Application</h3>
            </div>
            <button 
              onClick={() => onNavigateTab('applications')}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center font-medium"
            >
              Log ({applications.length}) <ArrowRight className="w-3 h-3 ml-1" />
            </button>
          </div>

          {applications.length > 0 ? (
            <div className="bento-tile bg-slate-950 border-emerald-900/50 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{applications[0].jobTitle}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                  APPLIED
                </span>
              </div>
              <p className="text-xs text-slate-400">{applications[0].company} • {applications[0].location}</p>

              <p className="text-xs text-slate-300 bg-slate-900 p-2 rounded-lg border border-slate-800 font-mono text-[11px]">
                "{applications[0].confirmationDetails}"
              </p>

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => generateResumePDF(userProfile.fullName, applications[0].company, applications[0].tailoredCV)}
                  className="flex items-center space-x-1 text-xs text-indigo-300 hover:text-indigo-200 bg-indigo-950 border border-indigo-800 px-2.5 py-1 rounded-lg font-medium"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Tailored PDF Resume</span>
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 text-center py-8">
              No applications submitted yet. Click "Run Scheduled Agent Search" above!
            </p>
          )}
        </div>

      </div>

    </div>
  );
};
