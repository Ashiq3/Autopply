import React, { useState, useEffect } from 'react';
import { Navbar, SidebarNav } from './components/Navbar';
import { AgentDashboard } from './components/AgentDashboard';
import { JobsSearchEngine } from './components/JobsSearchEngine';
import { ApplicationsTracker } from './components/ApplicationsTracker';
import { CandidateProfileEditor } from './components/CandidateProfileEditor';
import { SettingsSchedule } from './components/SettingsSchedule';
import {
  DEFAULT_USER_PROFILE,
  DEFAULT_SCHEDULE_CONFIG,
  SAMPLE_DISCOVERED_JOBS,
  SAMPLE_APPLICATIONS,
  DEFAULT_LLM_CONFIG,
} from './data/defaults';
import {
  UserProfile,
  ScheduleConfig,
  JobListing,
  ApplicationRecord,
  AgentLog,
  AgentStep,
  SavedSearchAlert,
  SearchExecutionStats,
  LlmProviderConfig,
  ProviderAvailabilityMap,
} from './types';
import { agentFetch, hasClientProviderKey, connectOpenRouterWithOAuth } from './utils/llmClient';
import { KeyRound, ExternalLink, RefreshCw } from 'lucide-react';

const STORAGE_KEYS = {
  PROFILE: 'autoapply_user_profile_v1',
  SCHEDULE: 'autoapply_schedule_config_v1',
  JOBS: 'autoapply_discovered_jobs_v1',
  APPLICATIONS: 'autoapply_applications_v1',
  THEME: 'autoapply_theme_v1',
  LLM_CONFIG: 'autoapply_llm_config_v2',
};

function loadInitialLlmConfig(): LlmProviderConfig {
  try {
    const v2 = localStorage.getItem(STORAGE_KEYS.LLM_CONFIG);
    if (v2) {
      const parsed = JSON.parse(v2) as LlmProviderConfig;
      if ((parsed.provider as string) !== 'gemini') {
        return parsed;
      }
    }

    const v1 = localStorage.getItem('autoapply_llm_config_v1');
    if (v1) {
      const parsed = JSON.parse(v1) as LlmProviderConfig;
      if ((parsed.provider as string) !== 'gemini') {
        return parsed;
      }
    }
  } catch {
    // Ignore storage access errors
  }
  return DEFAULT_LLM_CONFIG;
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function getInitialTheme(): 'light' | 'dark' {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    if (saved === 'dark' || saved === 'light') return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch {
    // Ignore storage access errors
  }
  return 'light';
}

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme);

  const [userProfile, setUserProfile] = useState<UserProfile>(() =>
    loadFromStorage(STORAGE_KEYS.PROFILE, DEFAULT_USER_PROFILE)
  );
  const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig>(() =>
    loadFromStorage(STORAGE_KEYS.SCHEDULE, DEFAULT_SCHEDULE_CONFIG)
  );
  const [discoveredJobs, setDiscoveredJobs] = useState<JobListing[]>(() =>
    loadFromStorage(STORAGE_KEYS.JOBS, SAMPLE_DISCOVERED_JOBS)
  );
  const [applications, setApplications] = useState<ApplicationRecord[]>(() =>
    loadFromStorage(STORAGE_KEYS.APPLICATIONS, SAMPLE_APPLICATIONS)
  );
  const [llmConfig, setLlmConfig] = useState<LlmProviderConfig>(loadInitialLlmConfig);
  const [providerAvailability, setProviderAvailability] = useState<ProviderAvailabilityMap | null>(null);
  const [, setCredentialVersion] = useState<number>(0);
  const [isConnectingOpenRouter, setIsConnectingOpenRouter] = useState<boolean>(false);
  const [bannerConnectError, setBannerConnectError] = useState<string | null>(null);
  const [blockedBannerAuthUrl, setBlockedBannerAuthUrl] = useState<string | null>(null);

  const [isAgentRunning, setIsAgentRunning] = useState<boolean>(false);
  const [pipelinePhase, setPipelinePhase] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [lastSearchStats, setLastSearchStats] = useState<SearchExecutionStats | null>(null);

  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([
    {
      id: 'log_0',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      step: 'IDLE',
      message: `Workspace initialized. ${
        scheduleConfig.enabled
          ? `Schedule configured for ${scheduleConfig.runTime} (${scheduleConfig.frequency}).`
          : 'Schedule paused.'
      }`,
      type: 'info',
    },
  ]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, theme);
    } catch {
      // Ignore storage access errors
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(userProfile));
    } catch {
      // Ignore storage quota errors
    }
  }, [userProfile]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(scheduleConfig));
    } catch {
      // Ignore storage quota errors
    }
  }, [scheduleConfig]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(discoveredJobs));
    } catch {
      // Ignore storage quota errors
    }
  }, [discoveredJobs]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(applications));
    } catch {
      // Ignore storage quota errors
    }
  }, [applications]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LLM_CONFIG, JSON.stringify(llmConfig));
    } catch {
      // Ignore storage quota errors
    }
  }, [llmConfig]);

  const refreshProviderAvailability = async () => {
    try {
      const res = await fetch('/api/health');
      if (!res.ok) return;
      const data = await res.json();
      if (data?.providers) {
        setProviderAvailability(data.providers as ProviderAvailabilityMap);
      }
    } catch {
      // Ignore background health check errors
    }
  };

  useEffect(() => {
    refreshProviderAvailability();
  }, []);

  useEffect(() => {
    if (activeTab === 'settings') {
      refreshProviderAvailability();
    }
  }, [activeTab]);

  const addLog = (
    step: AgentStep,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' | 'thought' = 'info'
  ) => {
    const newLog: AgentLog = {
      id: `log_${Date.now()}_${Math.random()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      step,
      message,
      type,
    };
    setAgentLogs((prev) => [newLog, ...prev]);
  };

  const handleResetDemoData = () => {
    [STORAGE_KEYS.PROFILE, STORAGE_KEYS.SCHEDULE, STORAGE_KEYS.JOBS, STORAGE_KEYS.APPLICATIONS].forEach((key) =>
      localStorage.removeItem(key)
    );
    setUserProfile(DEFAULT_USER_PROFILE);
    setScheduleConfig(DEFAULT_SCHEDULE_CONFIG);
    setDiscoveredJobs(SAMPLE_DISCOVERED_JOBS);
    setApplications(SAMPLE_APPLICATIONS);
    setSearchError(null);
    setLastSearchStats(null);
    addLog('IDLE', 'Workspace restored to clean sample data.', 'info');
  };

  const handleAddManualJob = (job: JobListing) => {
    setDiscoveredJobs((prev) => [job, ...prev]);
    addLog('EVALUATING_MATCH', `Added custom job "${job.title}" at ${job.company} (${job.matchScore}% skill overlap).`, 'success');
  };

  // Trigger Multi-Pass Live Job Search via Server-Side AI Provider
  const handleSearchJobs = async (searchParams: any) => {
    setIsSearching(true);
    setSearchError(null);
    addLog(
      'SEARCHING_INDEED',
      'Running 3-pass grounded search across job boards and direct ATS career portals...',
      'thought'
    );

    try {
      const response = await agentFetch(
        '/api/agent/search-indeed-jobs',
        {
          ...searchParams,
          excludedCompanies: scheduleConfig.excludedCompanies,
        },
        llmConfig
      );
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || `Search request failed (${response.status})`);
      }

      if (data.searchStats) {
        setLastSearchStats(data.searchStats);
      }

      if (data.jobs && data.jobs.length > 0) {
        setDiscoveredJobs((prev) => [...data.jobs, ...prev]);
        const statsNote = data.searchStats
          ? ` (${data.searchStats.passesExecuted} passes · ${data.searchStats.groundingSourcesCount} grounding sources · ${(
              data.searchStats.durationMs / 1000
            ).toFixed(1)}s)`
          : '';
        addLog(
          'EVALUATING_MATCH',
          `Verified ${data.jobs.length} new matching job listings${statsNote}.`,
          'success'
        );
      } else {
        addLog('SEARCHING_INDEED', 'Search completed with no additional listings matching current filters.', 'warning');
      }
    } catch (err: any) {
      const msg = err.message || 'Search failed.';
      setSearchError(msg);
      addLog('ERROR', msg, 'error');
    } finally {
      setIsSearching(false);
    }
  };

  // Run a Saved Search Alert directly from Schedule settings
  const handleRunSavedAlert = async (alert: SavedSearchAlert) => {
    setActiveTab('search');
    await handleSearchJobs({
      titles: alert.targetTitles,
      keywords: alert.queryKeywords,
      userProfileSummary: `${userProfile.fullName} - ${userProfile.customBio}`,
      datePosted: alert.datePosted,
      experienceLevel: alert.experienceLevel,
      minSalary: alert.minSalary || 'any',
      locationType: alert.locationType,
      nonVoiceOnly: Boolean(scheduleConfig.nonVoiceOnly),
    });
  };

  // Full Agent Preparation & Tailoring Pipeline
  const runAgentPipeline = async (targetJob?: JobListing) => {
    if (isAgentRunning) return;

    const excludedSet = new Set(scheduleConfig.excludedCompanies.map((c) => c.toLowerCase()));
    const jobToProcess =
      targetJob ||
      discoveredJobs.find(
        (j) =>
          j.status !== 'applied' &&
          !excludedSet.has(j.company.toLowerCase()) &&
          j.matchScore >= (scheduleConfig.minMatchScore || 0)
      ) ||
      discoveredJobs.find((j) => j.status !== 'applied');

    if (!jobToProcess) {
      addLog(
        'IDLE',
        'All discovered jobs have already been prepared. Search for new jobs in Job Search first.',
        'warning'
      );
      return;
    }

    setIsAgentRunning(true);
    setPipelinePhase(`Preparing package for ${jobToProcess.company}...`);
    setActiveJobId(jobToProcess.id);
    addLog('SEARCHING_INDEED', `Starting pipeline for "${jobToProcess.title}" at ${jobToProcess.company}.`, 'thought');

    try {
      const evaluatedScore = jobToProcess.matchScore;
      addLog(
        'EVALUATING_MATCH',
        `Evaluating fit against ${jobToProcess.requiredSkills.join(', ')} (${evaluatedScore}% baseline fit).`,
        'thought'
      );

      // Step 3: Discover Company Website & Career Page (reuse existing portal URL if already discovered)
      let companyInfo: { careerPageUrl: string; atsPlatform?: string } = {
        careerPageUrl: jobToProcess.careerPageUrl || '',
        atsPlatform: 'Career Portal',
      };
      if (companyInfo.careerPageUrl) {
        addLog('DISCOVERING_CAREER_PAGE', `Using discovered career portal: ${companyInfo.careerPageUrl}`, 'success');
      } else {
        setPipelinePhase(`Step 1/3 · Finding official career portal for ${jobToProcess.company}...`);
        addLog('FINDING_COMPANY_SITE', `Resolving official career portal for ${jobToProcess.company}...`, 'info');
        const companyRes = await agentFetch(
          '/api/agent/find-company-careers',
          { companyName: jobToProcess.company, jobTitle: jobToProcess.title },
          llmConfig
        );
        const compData = await companyRes.json();
        if (!companyRes.ok || !compData.success) {
          throw new Error(compData.error || 'Failed to discover company career portal.');
        }
        companyInfo = compData.companyDetails;
        addLog('DISCOVERING_CAREER_PAGE', `Career portal resolved: ${companyInfo.careerPageUrl}`, 'success');
      }

      // Step 4: Tailor Resume & Cover Letter
      setPipelinePhase(`Step 2/3 · Tailoring CV & cover letter for ${jobToProcess.title}...`);
      addLog('TAILORING_RESUME', `Tailoring CV and cover letter for ${jobToProcess.company}...`, 'thought');
      const tailorRes = await agentFetch(
        '/api/agent/tailor-resume',
        { userProfile, jobListing: jobToProcess },
        llmConfig
      );
      const tailorData = await tailorRes.json();
      if (!tailorRes.ok || !tailorData.success || !tailorData.result) {
        throw new Error(tailorData.error || 'Failed to tailor resume and cover letter.');
      }
      const tailoredResult = tailorData.result;
      addLog(
        'TAILORING_RESUME',
        `Tailored CV & Cover Letter generated (${tailoredResult.matchScore || jobToProcess.matchScore}% alignment).`,
        'success'
      );

      // Step 5: Map ATS Form Fields
      setPipelinePhase(`Step 3/3 · Mapping ATS application form fields...`);
      addLog('MAPPING_FORM', 'Mapping candidate profile details onto ATS form inputs...', 'thought');
      const formRes = await agentFetch(
        '/api/agent/map-form-fields',
        {
          userProfile,
          jobListing: jobToProcess,
          tailoredCoverLetter: tailoredResult.tailoredCoverLetter,
        },
        llmConfig
      );
      const formData = await formRes.json();
      if (!formRes.ok || !formData.success) {
        throw new Error(formData.error || 'Failed to map ATS form fields.');
      }
      const formFields = formData.formFields || [];
      addLog('MAPPING_FORM', `Mapped ${formFields.length} ATS form fields.`, 'success');

      // Step 6: Save Prepared Application Package
      const newAppRecord: ApplicationRecord = {
        id: `app_${Date.now()}`,
        jobId: jobToProcess.id,
        jobTitle: jobToProcess.title,
        company: jobToProcess.company,
        location: jobToProcess.location,
        appliedAt: new Date().toISOString(),
        matchScore: tailoredResult.matchScore || jobToProcess.matchScore,
        tailoredCV: tailoredResult.tailoredCV,
        tailoredCoverLetter: tailoredResult.tailoredCoverLetter,
        formFieldsFilled: formFields,
        applyMethod: jobToProcess.applyMethod,
        companyCareerPageUrl: companyInfo.careerPageUrl,
        confirmationDetails: `Tailored package prepared for ${jobToProcess.company} (${companyInfo.atsPlatform || 'Career Portal'}).`,
        status: 'applied',
        notes: tailoredResult.summaryReasoning || 'Prepared by AutoApply pipeline.',
      };

      setApplications((prev) => [newAppRecord, ...prev]);
      setDiscoveredJobs((prev) => prev.map((j) => (j.id === jobToProcess.id ? { ...j, status: 'applied' } : j)));

      addLog(
        'SUBMITTING_APPLICATION',
        `Application package for ${jobToProcess.company} saved to Applications.`,
        'success'
      );
    } catch (err: any) {
      addLog('ERROR', err.message || 'Pipeline failed.', 'error');
    } finally {
      setIsAgentRunning(false);
      setPipelinePhase(null);
      setActiveJobId(null);
    }
  };

  const handleUpdateApplicationStatus = (appId: string, newStatus: ApplicationRecord['status']) => {
    setApplications((prev) => prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a)));
  };

  const handleDeleteApplication = (appId: string) => {
    setApplications((prev) => prev.filter((a) => a.id !== appId));
  };

  const handleRemoveJob = (jobId: string) => {
    setDiscoveredJobs((prev) => prev.filter((j) => j.id !== jobId));
  };

  const isActiveProviderConnected =
    Boolean(providerAvailability?.[llmConfig.provider]) || hasClientProviderKey(llmConfig.provider);

  const handleQuickOpenRouterConnect = async () => {
    setIsConnectingOpenRouter(true);
    setBannerConnectError(null);
    setBlockedBannerAuthUrl(null);
    try {
      const { maskedHint } = await connectOpenRouterWithOAuth({
        persistInBrowser: true,
        onPopupBlocked: (url) => {
          setBlockedBannerAuthUrl(url);
        },
      });
      setBlockedBannerAuthUrl(null);
      setLlmConfig({ provider: 'openrouter', model: 'openrouter/free' });
      setCredentialVersion((v) => v + 1);
      addLog('IDLE', `Connected OpenRouter account (${maskedHint}).`, 'success');
    } catch (err: any) {
      setBannerConnectError(err?.message || 'Could not complete OpenRouter sign-in.');
    } finally {
      setIsConnectingOpenRouter(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fb] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex transition-colors">
      <SidebarNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        scheduleConfig={scheduleConfig}
        userProfile={userProfile}
        llmConfig={llmConfig}
        isProviderConnected={providerAvailability === null ? undefined : isActiveProviderConnected}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          scheduleConfig={scheduleConfig}
          userProfile={userProfile}
          llmConfig={llmConfig}
          isAgentRunning={isAgentRunning}
          onRunAgent={() => runAgentPipeline()}
          onOpenMobile={() => setMobileNavOpen(true)}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />

        <main className="flex-1 max-w-[1200px] w-full mx-auto px-5 sm:px-8 lg:px-10 py-8 sm:py-10">
          {providerAvailability !== null && !isActiveProviderConnected && activeTab !== 'settings' && (
            <div className="mb-6 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/70 rounded-2xl px-5 py-4 space-y-2 text-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3 text-amber-950 dark:text-amber-100">
                  <KeyRound className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                  <span>
                    Sign in with <strong>OpenRouter</strong> in one click (supports free models, no API key pasting
                    needed) or choose another AI provider in Settings.
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={handleQuickOpenRouterConnect}
                    disabled={isConnectingOpenRouter}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-2xs transition-colors whitespace-nowrap disabled:opacity-60"
                  >
                    {isConnectingOpenRouter ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4" />
                        <span>Connect with OpenRouter</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100 font-semibold hover:bg-amber-100/60 dark:hover:bg-amber-900/40 transition-colors whitespace-nowrap"
                  >
                    Settings
                  </button>
                </div>
              </div>
              {blockedBannerAuthUrl && (
                <div className="text-xs font-medium text-amber-900 dark:text-amber-200 pl-8 flex flex-wrap items-center gap-2">
                  <span>Popup was blocked by your browser:</span>
                  <a
                    href={blockedBannerAuthUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-semibold text-blue-700 dark:text-blue-300"
                  >
                    Open OpenRouter Sign-In
                  </a>
                </div>
              )}
              {bannerConnectError && (
                <div className="text-xs font-medium text-red-700 dark:text-red-300 pl-8">{bannerConnectError}</div>
              )}
            </div>
          )}

          {activeTab === 'dashboard' && (
            <AgentDashboard
              discoveredJobs={discoveredJobs}
              applications={applications}
              agentLogs={agentLogs}
              scheduleConfig={scheduleConfig}
              userProfile={userProfile}
              llmConfig={llmConfig}
              isAgentRunning={isAgentRunning}
              pipelinePhase={pipelinePhase}
              onRunAgent={() => runAgentPipeline()}
              onNavigateTab={setActiveTab}
              onUpdateProfile={(updated) => {
                setUserProfile(updated);
                addLog('IDLE', `Imported resume profile for ${updated.fullName}.`, 'success');
              }}
            />
          )}

          {activeTab === 'search' && (
            <JobsSearchEngine
              discoveredJobs={discoveredJobs}
              userProfile={userProfile}
              llmConfig={llmConfig}
              isSearching={isSearching}
              searchError={searchError}
              lastSearchStats={lastSearchStats}
              onDismissError={() => setSearchError(null)}
              isAgentRunning={isAgentRunning}
              activeJobId={activeJobId}
              onSearchJobs={handleSearchJobs}
              onAddManualJob={handleAddManualJob}
              onApplySingleJob={(job) => runAgentPipeline(job)}
              onRemoveJob={handleRemoveJob}
              onUpdateScreenedJobs={(screened) => {
                setDiscoveredJobs(screened);
                addLog('EVALUATING_MATCH', `Calibrated fit scores for ${screened.length} openings.`, 'success');
              }}
              onGoToApplications={() => setActiveTab('applications')}
              onOpenSettings={() => setActiveTab('settings')}
            />
          )}

          {activeTab === 'applications' && (
            <ApplicationsTracker
              applications={applications}
              userProfile={userProfile}
              onUpdateStatus={handleUpdateApplicationStatus}
              onDeleteApplication={handleDeleteApplication}
            />
          )}

          {activeTab === 'profile' && (
            <CandidateProfileEditor
              userProfile={userProfile}
              llmConfig={llmConfig}
              onSaveProfile={(updated) => setUserProfile(updated)}
              onResetDemoData={handleResetDemoData}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsSchedule
              scheduleConfig={scheduleConfig}
              onSaveSchedule={(updated) => setScheduleConfig(updated)}
              onRunSavedAlert={handleRunSavedAlert}
              onResetDemoData={handleResetDemoData}
              llmConfig={llmConfig}
              onChangeLlmConfig={setLlmConfig}
              providerAvailability={providerAvailability}
              onRefreshProviders={refreshProviderAvailability}
              onCredentialChange={() => setCredentialVersion((v) => v + 1)}
            />
          )}
        </main>

        <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-5 px-5 sm:px-8 lg:px-10 text-sm text-zinc-500 dark:text-zinc-400">
          <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-start">
              <span className="font-display font-semibold text-zinc-900 dark:text-zinc-100">AutoApply AI</span>
              <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-700">·</span>
              <span>MIT License · Open-Source Job Search &amp; Resume Workspace</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className="text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 underline underline-offset-4"
              >
                {userProfile.fullName}
              </button>
              <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-700">·</span>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className="text-sm font-mono text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 underline underline-offset-4"
              >
                {llmConfig.provider} ({llmConfig.model})
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
