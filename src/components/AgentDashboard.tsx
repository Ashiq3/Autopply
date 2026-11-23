import React, { useState, useRef } from 'react';
import {
  ArrowRight,
  Download,
  Play,
  Upload,
  Check,
  AlertCircle,
  RefreshCw,
  FileText,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  JobListing,
  ApplicationRecord,
  AgentLog,
  ScheduleConfig,
  UserProfile,
  LlmProviderConfig,
} from '../types';
import { generateResumePDF } from '../utils/pdfGenerator';
import { uploadAndParseCVFile } from '../utils/cvUpload';

interface AgentDashboardProps {
  discoveredJobs: JobListing[];
  applications: ApplicationRecord[];
  agentLogs: AgentLog[];
  scheduleConfig: ScheduleConfig;
  userProfile: UserProfile;
  llmConfig?: LlmProviderConfig;
  isAgentRunning: boolean;
  pipelinePhase?: string | null;
  onRunAgent: () => void;
  onNavigateTab: (tab: string) => void;
  onUpdateProfile: (updated: UserProfile) => void;
}

export const AgentDashboard: React.FC<AgentDashboardProps> = ({
  discoveredJobs,
  applications,
  agentLogs,
  userProfile,
  llmConfig,
  isAgentRunning,
  pipelinePhase,
  onRunAgent,
  onNavigateTab,
  onUpdateProfile,
}) => {
  const [selectedLogFilter, setSelectedLogFilter] = useState<'all' | 'thought' | 'info' | 'success' | 'error'>('all');
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [isUploadingCV, setIsUploadingCV] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<{ text: string; isError: boolean } | null>(null);
  const homeFileInputRef = useRef<HTMLInputElement>(null);

  const filteredLogs = agentLogs.filter((log) => {
    if (selectedLogFilter === 'all') return true;
    return log.type === selectedLogFilter;
  });

  const isDemoProfile = userProfile.id === 'usr_demo_1';
  const hasRealApplications = applications.some((a) => a.id !== 'app_demo_1');
  const avgFit =
    discoveredJobs.length > 0
      ? Math.round(discoveredJobs.reduce((acc, j) => acc + j.matchScore, 0) / discoveredJobs.length)
      : 0;
  const pendingJobsCount = discoveredJobs.filter((j) => j.status !== 'applied').length;
  const latestError = agentLogs.find((l) => l.type === 'error');

  const handleProcessCV = async (file: File) => {
    setIsUploadingCV(true);
    setUploadNotice({ text: `Reading and extracting "${file.name}"...`, isError: false });
    try {
      const updated = await uploadAndParseCVFile(file, userProfile, llmConfig);
      onUpdateProfile(updated);
      setUploadNotice({
        text: `Loaded "${file.name}" for ${updated.fullName} (${updated.skills.length} skills extracted).`,
        isError: false,
      });
    } catch (err: any) {
      setUploadNotice({
        text: err.message || 'Could not parse the uploaded resume file.',
        isError: true,
      });
    } finally {
      setIsUploadingCV(false);
      if (homeFileInputRef.current) homeFileInputRef.current.value = '';
    }
  };

  const handleHomeFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await handleProcessCV(file);
  };

  const handleHomeFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await handleProcessCV(file);
  };

  const workspaceGuide = [
    {
      num: '01',
      tabLabel: 'Candidate CV',
      statusText: isDemoProfile ? 'Sample template active' : `${userProfile.skills.length} skills ready`,
      isDone: !isDemoProfile,
      description:
        'Upload your PDF, DOCX, TXT, or Markdown resume above, or open Candidate CV to refine your contact info, core skills, work history, and base CV.',
      ctaLabel: 'Open Candidate CV',
      action: () => onNavigateTab('profile'),
    },
    {
      num: '02',
      tabLabel: 'Job Search & Audits',
      statusText: `${discoveredJobs.length} openings saved`,
      isDone: discoveredJobs.length > 0,
      description:
        'Run multi-pass web searches with filters, get AI keyword suggestions from your resume, paste any external job post directly, and run 4-part ATS compatibility audits.',
      ctaLabel: 'Open Job Search',
      action: () => onNavigateTab('search'),
    },
    {
      num: '03',
      tabLabel: 'Tailor & Map Pipeline',
      statusText: isAgentRunning ? 'Running pipeline...' : `${pendingJobsCount} pending`,
      isDone: hasRealApplications,
      description:
        'Click Prepare Package on any opening to calibrate job fit, resolve the career portal, tailor your CV & cover letter without fabrication, and map ATS answers.',
      ctaLabel: isAgentRunning ? 'Preparing...' : 'Prepare Next App',
      action: onRunAgent,
      disabled: isAgentRunning,
    },
    {
      num: '04',
      tabLabel: 'Applications & PDFs',
      statusText: `${applications.length} packages ready`,
      isDone: hasRealApplications,
      description:
        'Inspect tailored Markdown resumes and cover letters side by side, copy pre-filled ATS form fields with one click, track interview stages, and download print-ready PDFs.',
      ctaLabel: 'Open Applications',
      action: () => onNavigateTab('applications'),
    },
    {
      num: '05',
      tabLabel: 'Settings & Providers',
      statusText: llmConfig ? `${llmConfig.provider} active` : 'Model settings',
      isDone: false,
      description:
        'Connect OpenRouter, OpenAI, Claude, Groq, DeepSeek, Mistral, Together, or any OpenAI-compatible AI provider, exclude companies, adjust match thresholds, and trigger saved search presets.',
      ctaLabel: 'Open Settings',
      action: () => onNavigateTab('settings'),
    },
  ];

  return (
    <div className="space-y-12">
      {/* Product Hero Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left: Product Value Proposition + Primary CTAs */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-4">
            <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
              Private Browser-First Workspace · Grounded ATS Matching
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-bold text-zinc-950 dark:text-zinc-50 tracking-tight leading-[1.12]">
              Turn your CV into tailored, ATS-ready job applications.
            </h1>
            <p className="text-base sm:text-[17px] text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-2xl">
              Upload your resume once, compare it against real job postings with honest skill-gap audits, generate
              role-specific CVs and cover letters without inventing experience, and export clean PDFs in seconds.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3.5 pt-1">
            <button
              type="button"
              onClick={() => onNavigateTab('search')}
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm active:scale-[0.98] transition-all whitespace-nowrap"
            >
              <span>Search or Paste Jobs</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onRunAgent}
              disabled={isAgentRunning}
              className={`inline-flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                isAgentRunning
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700 cursor-not-allowed'
                  : 'bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-950 shadow-xs active:scale-[0.98]'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isAgentRunning ? 'Preparing Package...' : 'Prepare Next Application'}</span>
            </button>
          </div>

          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            Stored locally in your browser · No account required · Use your own OpenRouter or third-party AI key
          </div>
        </div>

        {/* Right: Interactive Upload Resume Product Card */}
        <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">Upload Your Resume</h2>
              {!isDemoProfile && (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  <Check className="w-4 h-4" />
                  <span>Loaded</span>
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Start here to extract your skills, roles, and experience automatically—replacing the{' '}
              {isDemoProfile ? 'sample template' : 'active profile'}.
            </p>
          </div>

          <input
            type="file"
            ref={homeFileInputRef}
            onChange={handleHomeFileChange}
            accept=".pdf,.docx,.txt,.md"
            className="hidden"
          />

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingFile(true);
            }}
            onDragLeave={() => setIsDraggingFile(false)}
            onDrop={handleHomeFileDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors space-y-4 ${
              isDraggingFile
                ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/30'
                : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-950/70'
            }`}
          >
            <div className="mx-auto w-11 h-11 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-2xs">
              {isUploadingCV ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Upload className="w-5 h-5" />
              )}
            </div>

            <div className="space-y-1">
              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {isUploadingCV ? 'Extracting resume details...' : 'Drag and drop your CV file here'}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">Supports .PDF, .DOCX, .TXT, or .MD</div>
            </div>

            <button
              type="button"
              onClick={() => !isUploadingCV && homeFileInputRef.current?.click()}
              disabled={isUploadingCV}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors disabled:opacity-60"
            >
              <Upload className="w-4 h-4" />
              <span>{isUploadingCV ? 'Reading Resume...' : 'Choose Resume File'}</span>
            </button>
          </div>

          {uploadNotice && (
            <div
              className={`px-4 py-3 rounded-xl border text-sm flex items-center justify-between gap-3 ${
                uploadNotice.isError
                  ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/70 text-red-800 dark:text-red-200'
                  : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200'
              }`}
            >
              <span className="truncate">{uploadNotice.text}</span>
              <button
                type="button"
                onClick={() => setUploadNotice(null)}
                aria-label="Dismiss upload message"
                className="p-1 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2 min-w-0 text-sm text-zinc-600 dark:text-zinc-400">
              <FileText className="w-4 h-4 shrink-0 text-zinc-400" />
              <span className="truncate font-medium text-zinc-800 dark:text-zinc-200">
                {userProfile.fullName}
              </span>
              <span className="shrink-0 text-zinc-400">·</span>
              <span className="shrink-0 tabular-nums">{userProfile.skills.length} skills</span>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab('profile')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-zinc-800 dark:text-zinc-100 shadow-2xs transition-colors whitespace-nowrap shrink-0"
            >
              <span>Edit Profile &amp; CV</span>
            </button>
          </div>
        </div>
      </section>

      {/* Active Pipeline Banner */}
      {isAgentRunning && pipelinePhase && (
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/70 rounded-2xl px-6 py-4 flex items-center justify-between gap-4 text-sm text-blue-900 dark:text-blue-200">
          <div className="flex items-center gap-3 font-medium">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400 shrink-0" />
            <span>{pipelinePhase}</span>
          </div>
          <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-300 shrink-0">
            Running
          </span>
        </div>
      )}

      {/* Latest Error Banner */}
      {latestError && agentLogs[0]?.id === latestError.id && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/70 rounded-2xl px-6 py-4 flex items-start gap-3 text-sm text-red-800 dark:text-red-200">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-red-900 dark:text-red-100">Action required</p>
            <p>{latestError.message}</p>
          </div>
        </div>
      )}

      {/* Full-Width Product Metrics Strip */}
      <section aria-label="Workspace Snapshot">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 sm:divide-x divide-zinc-200 dark:divide-zinc-800">
          <div className="p-6 space-y-1.5">
            <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Saved Packages</div>
            <div className="text-2xl sm:text-3xl font-display font-bold text-zinc-950 dark:text-zinc-50 tabular-nums">
              {applications.length}
            </div>
          </div>

          <div className="p-6 space-y-1.5">
            <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Pending Openings</div>
            <div className="text-2xl sm:text-3xl font-display font-bold text-zinc-950 dark:text-zinc-50 tabular-nums">
              {pendingJobsCount}
            </div>
          </div>

          <div className="p-6 space-y-1.5">
            <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Average Match Score</div>
            <div className="text-2xl sm:text-3xl font-display font-bold text-zinc-950 dark:text-zinc-50 tabular-nums">
              {avgFit}%
            </div>
          </div>

          <div className="p-6 space-y-1.5">
            <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Active Candidate</div>
            <div className="text-lg font-display font-bold text-zinc-950 dark:text-zinc-50 truncate pt-1">
              {isDemoProfile ? 'Sample Template' : userProfile.fullName}
            </div>
          </div>
        </div>
      </section>

      {/* How AutoApply Works — 5-Step Product Walkthrough */}
      <section className="space-y-5">
        <div className="space-y-1.5">
          <h2 className="text-2xl font-bold text-zinc-950 dark:text-zinc-50 tracking-tight">
            How AutoApply Works
          </h2>
          <p className="text-sm sm:text-[15px] text-zinc-600 dark:text-zinc-400 max-w-2xl">
            Follow these five steps across the top navigation bar to go from your base resume to tailored PDF
            applications.
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl divide-y divide-zinc-200 dark:divide-zinc-800 overflow-hidden">
          {workspaceGuide.map((item) => (
            <div
              key={item.num}
              className="p-6 sm:px-8 sm:py-6 flex flex-col md:flex-row md:items-center justify-between gap-5 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors"
            >
              <div className="flex items-start gap-5 min-w-0">
                <span className="font-mono text-base font-bold text-blue-600 dark:text-blue-400 tabular-nums pt-0.5 shrink-0">
                  {item.num}
                </span>
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center flex-wrap gap-2.5">
                    <h3 className="text-base sm:text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                      {item.tabLabel}
                    </h3>
                    <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-700">
                      ·
                    </span>
                    <span
                      className={`text-sm font-medium tabular-nums ${
                        item.isDone
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      {item.statusText}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-3xl">
                    {item.description}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={item.action}
                disabled={item.disabled}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-zinc-900 dark:text-zinc-100 shadow-2xs transition-all shrink-0 self-start md:self-center whitespace-nowrap disabled:opacity-50"
              >
                <span>{item.ctaLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Product Showcase Grid: Recent Matches + Latest Application Package */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col overflow-hidden">
          <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">Recent Job Matches</h2>
            <button
              type="button"
              onClick={() => onNavigateTab('search')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:border-blue-500 hover:text-blue-700 dark:hover:text-blue-300 text-zinc-800 dark:text-zinc-100 transition-colors whitespace-nowrap"
            >
              <span>View All ({discoveredJobs.length})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 flex-1">
            {discoveredJobs.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
                No job listings yet. Open Job Search to search live openings or paste a job posting.
              </div>
            ) : (
              discoveredJobs.slice(0, 4).map((job) => (
                <div
                  key={job.id}
                  className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="text-base font-semibold text-zinc-950 dark:text-zinc-100 truncate">
                      {job.title}
                    </div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                      {job.company} · {job.location} · {job.source}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {job.status === 'applied' && (
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                        <Check className="w-4 h-4" />
                        Prepared
                      </span>
                    )}
                    <span className="font-mono text-base font-bold text-zinc-950 dark:text-zinc-50 tabular-nums">
                      {job.matchScore}%
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col overflow-hidden">
          <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">Latest Application Package</h2>
            <button
              type="button"
              onClick={() => onNavigateTab('applications')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:border-blue-500 hover:text-blue-700 dark:hover:text-blue-300 text-zinc-800 dark:text-zinc-100 transition-colors whitespace-nowrap"
            >
              <span>All ({applications.length})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {applications.length > 0 ? (
            <div className="p-6 sm:p-7 space-y-5 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                  {applications[0].status.replace('_', ' ')}
                </div>
                <div className="text-xl font-bold text-zinc-950 dark:text-zinc-50">{applications[0].jobTitle}</div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  {applications[0].company} · {applications[0].location} · {applications[0].matchScore}% match
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-300 pt-2 leading-relaxed">
                  {applications[0].confirmationDetails}
                </p>
              </div>

              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() =>
                    generateResumePDF(userProfile.fullName, applications[0].company, applications[0].tailoredCV)
                  }
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-950 shadow-xs transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF Resume</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateTab('applications')}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:border-blue-500 text-zinc-800 dark:text-zinc-100 shadow-2xs transition-colors"
                >
                  <span>Inspect Details</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-10 text-center text-sm text-zinc-500 dark:text-zinc-400 flex-1 flex items-center justify-center">
              No packages prepared yet. Click Prepare Next Application above.
            </div>
          )}
        </div>
      </section>

      {/* Quiet Collapsible Activity History */}
      <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-100">Workspace Activity Log</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Review recent CV imports, searches, and preparation runs ({agentLogs.length} entries).
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowActivityLog((prev) => !prev)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100 shadow-2xs transition-colors"
          >
            <span>{showActivityLog ? 'Hide Activity Log' : 'Show Activity Log'}</span>
            {showActivityLog ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showActivityLog && (
          <div className="border-t border-zinc-200 dark:border-zinc-800">
            <div className="px-6 py-3 bg-zinc-50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-1.5 flex-wrap">
              {(['all', 'thought', 'info', 'success', 'error'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setSelectedLogFilter(f)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${
                    selectedLogFilter === f
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950'
                      : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:text-zinc-950 dark:hover:text-zinc-100'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[280px] overflow-y-auto">
              {filteredLogs.length === 0 ? (
                <div className="px-6 py-10 text-center text-sm text-zinc-400 dark:text-zinc-500">
                  No log entries match this filter.
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div key={log.id} className="px-6 py-3.5 flex items-start gap-4 text-sm">
                    <span className="font-mono text-xs text-zinc-400 dark:text-zinc-500 tabular-nums shrink-0 pt-0.5">
                      {log.timestamp}
                    </span>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2 text-xs">
                        <span
                          className={`font-semibold ${
                            log.type === 'error'
                              ? 'text-red-600 dark:text-red-400'
                              : log.type === 'success'
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : log.type === 'warning'
                                  ? 'text-amber-700 dark:text-amber-400'
                                  : log.type === 'thought'
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-zinc-600 dark:text-zinc-400'
                          }`}
                        >
                          {log.type.toUpperCase()}
                        </span>
                        <span className="text-zinc-300 dark:text-zinc-700">·</span>
                        <span className="font-mono text-zinc-400 dark:text-zinc-500">{log.step}</span>
                      </div>
                      <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed break-words">{log.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
