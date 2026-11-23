import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  ExternalLink,
  Play,
  FileText,
  X,
  BarChart3,
  AlertCircle,
  Check,
  RefreshCw,
  Trash2,
  Sparkles,
  Plus,
} from 'lucide-react';
import {
  JobListing,
  UserProfile,
  IndeedFilterState,
  JobCompatibilityAnalysis,
  SearchExecutionStats,
  KeywordSuggestionsResult,
  LlmProviderConfig,
} from '../types';
import { agentFetch } from '../utils/llmClient';

interface JobsSearchEngineProps {
  discoveredJobs: JobListing[];
  userProfile: UserProfile;
  llmConfig?: LlmProviderConfig;
  isSearching: boolean;
  searchError: string | null;
  lastSearchStats: SearchExecutionStats | null;
  onDismissError: () => void;
  isAgentRunning: boolean;
  activeJobId: string | null;
  onSearchJobs: (searchParams: any) => void;
  onAddManualJob?: (job: JobListing) => void;
  onApplySingleJob: (job: JobListing) => void;
  onRemoveJob: (jobId: string) => void;
  onUpdateScreenedJobs?: (jobs: JobListing[]) => void;
  onGoToApplications: () => void;
  onOpenSettings?: () => void;
}

const KNOWN_TECH_AND_WORKFLOW_TERMS = [
  'Lead Generation',
  'Email Marketing',
  'Email Automation',
  'Mailchimp',
  'HubSpot',
  'Klaviyo',
  'Google Sheets',
  'Sheet Automation',
  'Zapier',
  'Make.com',
  'n8n',
  'CRM Management',
  'Data Entry',
  'Data Enrichment',
  'Web Scraping',
  'AI Automation',
  'AI Agent',
  'Cold Email',
  'B2B Outbound',
  'React',
  'TypeScript',
  'Node.js',
  'Next.js',
  'Python',
  'PostgreSQL',
  'REST APIs',
  'Tailwind CSS',
  'Docker',
  'GitHub Actions',
  'SQL',
  'Airtable',
  'Apollo.io',
  'Notion',
];

export const JobsSearchEngine: React.FC<JobsSearchEngineProps> = ({
  discoveredJobs,
  userProfile,
  llmConfig,
  isSearching,
  searchError,
  lastSearchStats,
  onDismissError,
  isAgentRunning,
  activeJobId,
  onSearchJobs,
  onAddManualJob,
  onApplySingleJob,
  onRemoveJob,
  onUpdateScreenedJobs,
  onGoToApplications,
  onOpenSettings,
}) => {
  const [titles, setTitles] = useState<string[]>(
    userProfile.targetJobTitles && userProfile.targetJobTitles.length > 0
      ? userProfile.targetJobTitles
      : ['Junior Full-Stack Developer', 'Frontend React Developer']
  );
  const [newTitleInput, setNewTitleInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>(
    userProfile.skills && userProfile.skills.length > 0 ? userProfile.skills : ['React', 'TypeScript', 'Node.js']
  );
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const [selectedJobForModal, setSelectedJobForModal] = useState<JobListing | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'applied'>('all');

  const [searchElapsedSec, setSearchElapsedSec] = useState(0);

  const [aiSuggestions, setAiSuggestions] = useState<KeywordSuggestionsResult | null>(null);
  const [isSuggestingKeywords, setIsSuggestingKeywords] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  const [compatibilityMap, setCompatibilityMap] = useState<Record<string, JobCompatibilityAnalysis>>({});
  const [analyzingJobId, setAnalyzingJobId] = useState<string | null>(null);
  const [expandedAnalysisJobId, setExpandedAnalysisJobId] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isBatchScreening, setIsBatchScreening] = useState(false);

  const [isAddingManualJob, setIsAddingManualJob] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualCompany, setManualCompany] = useState('');
  const [manualLocation, setManualLocation] = useState('Remote');
  const [manualUrl, setManualUrl] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);

  const [filters, setFilters] = useState<IndeedFilterState>({
    datePosted: 'anytime',
    jobType: 'all',
    experienceLevel: userProfile.experienceLevel || 'entry',
    minSalary: 'any',
    locationType: 'remote_only',
    companyType: 'direct_only',
    sortBy: 'relevance',
    radius: 'exact',
    nonVoiceOnly: false,
  });

  useEffect(() => {
    if (userProfile.targetJobTitles && userProfile.targetJobTitles.length > 0) {
      setTitles(userProfile.targetJobTitles);
    }
    if (userProfile.skills && userProfile.skills.length > 0) {
      setKeywords(userProfile.skills);
    }
  }, [userProfile.id, userProfile.targetJobTitles, userProfile.skills]);

  useEffect(() => {
    if (!isSearching) {
      setSearchElapsedSec(0);
      return;
    }
    const interval = setInterval(() => {
      setSearchElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isSearching]);

  const localCvSignals = useMemo(() => {
    const corpus = [
      userProfile.customBio || '',
      userProfile.masterCV || '',
      ...(userProfile.skills || []),
      ...(userProfile.certificationsList || []),
      ...(userProfile.projects || []).flatMap((p) => [p.name, p.description, ...(p.techStack || [])]),
      ...(userProfile.workHistory || []).flatMap((w) => [w.role, ...(w.highlights || [])]),
    ]
      .join(' ')
      .toLowerCase();

    const activeLower = new Set(keywords.map((k) => k.toLowerCase()));
    const extractedFromCorpus = KNOWN_TECH_AND_WORKFLOW_TERMS.filter(
      (term) => corpus.includes(term.toLowerCase()) && !activeLower.has(term.toLowerCase())
    );

    const projectTech = (userProfile.projects || [])
      .flatMap((p) => p.techStack || [])
      .filter((t) => t && !activeLower.has(t.toLowerCase()));

    const unusedProfileSkills = (userProfile.skills || []).filter(
      (s) => s && !activeLower.has(s.toLowerCase())
    );

    return Array.from(new Set([...unusedProfileSkills, ...projectTech, ...extractedFromCorpus])).slice(0, 10);
  }, [userProfile, keywords]);

  const handleAddTitle = (titleVal?: string) => {
    const val = (titleVal ?? newTitleInput).trim();
    if (val && !titles.some((t) => t.toLowerCase() === val.toLowerCase())) {
      setTitles((prev) => [...prev, val]);
      if (titleVal === undefined) setNewTitleInput('');
    }
  };

  const handleRemoveTitle = (tToRemove: string) => {
    setTitles(titles.filter((t) => t !== tToRemove));
  };

  const handleAddKeyword = (kwVal?: string) => {
    const val = (kwVal ?? newKeywordInput).trim();
    if (val && !keywords.some((k) => k.toLowerCase() === val.toLowerCase())) {
      setKeywords((prev) => [...prev, val]);
      if (kwVal === undefined) setNewKeywordInput('');
    }
  };

  const handleRemoveKeyword = (kToRemove: string) => {
    setKeywords(keywords.filter((k) => k !== kToRemove));
  };

  const handleFilterChange = (field: keyof IndeedFilterState, value: any) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleTriggerSearch = () => {
    onSearchJobs({
      titles,
      keywords,
      userProfileSummary: `${userProfile.fullName} - ${userProfile.customBio}`,
      datePosted: filters.datePosted,
      jobType: filters.jobType,
      experienceLevel: filters.experienceLevel,
      minSalary: filters.minSalary,
      locationType: filters.locationType,
      companyType: filters.companyType,
      sortBy: filters.sortBy,
      nonVoiceOnly: Boolean(filters.nonVoiceOnly),
    });
  };

  const handleFetchCvSuggestions = async () => {
    setIsSuggestingKeywords(true);
    setSuggestionError(null);
    try {
      const res = await agentFetch(
        '/api/agent/suggest-keywords',
        {
          userProfile,
          currentTitles: titles,
          currentKeywords: keywords,
        },
        llmConfig
      );
      const data = await res.json();
      if (!res.ok || !data.success || !data.suggestions) {
        throw new Error(data.error || 'Failed to generate CV keyword suggestions.');
      }
      setAiSuggestions(data.suggestions);
    } catch (err: any) {
      setSuggestionError(err.message || 'Unable to generate keyword suggestions.');
    } finally {
      setIsSuggestingKeywords(false);
    }
  };

  const computeQuickKeywords = (job: JobListing) => {
    const userSkillsNormalized = (userProfile.skills || []).map((s) => s.toLowerCase());
    const reqSkills = job.requiredSkills || [];

    const matched = reqSkills.filter((s) =>
      userSkillsNormalized.some((us) => us.includes(s.toLowerCase()) || s.toLowerCase().includes(us))
    );
    const missing = reqSkills.filter((s) => !matched.includes(s));

    return { matched, missing };
  };

  const handleAnalyzeCompatibility = async (job: JobListing) => {
    setAnalysisError(null);
    if (compatibilityMap[job.id]) {
      setExpandedAnalysisJobId(expandedAnalysisJobId === job.id ? null : job.id);
      return;
    }

    setAnalyzingJobId(job.id);
    setExpandedAnalysisJobId(job.id);

    try {
      const res = await agentFetch(
        '/api/agent/analyze-job-compatibility',
        { job, userProfile },
        llmConfig
      );

      const data = await res.json();
      if (!res.ok || !data.success || !data.analysis) {
        throw new Error(data.error || 'Failed to run ATS compatibility audit.');
      }

      setCompatibilityMap((prev) => ({
        ...prev,
        [job.id]: data.analysis,
      }));
    } catch (err: any) {
      setAnalysisError(err.message || 'Unable to complete ATS audit.');
      setExpandedAnalysisJobId(null);
    } finally {
      setAnalyzingJobId(null);
    }
  };

  const handleBatchDecisionScreen = async () => {
    if (!onUpdateScreenedJobs || discoveredJobs.length === 0 || isBatchScreening) return;
    setIsBatchScreening(true);
    setAnalysisError(null);
    try {
      const res = await agentFetch(
        '/api/agent/decision-evaluate-jobs',
        { jobs: discoveredJobs, userProfile },
        llmConfig
      );
      const data = await res.json();
      if (!res.ok || !data.success || !Array.isArray(data.jobs)) {
        throw new Error(data.error || 'Could not calibrate job fit scores.');
      }
      onUpdateScreenedJobs(data.jobs);
    } catch (err: any) {
      setAnalysisError(err.message || 'Unable to calibrate job fit scores.');
    } finally {
      setIsBatchScreening(false);
    }
  };

  const handleCreateManualJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddManualJob) return;

    const cleanTitle = manualTitle.trim();
    const cleanCompany = manualCompany.trim();
    const cleanDesc = manualDescription.trim();

    if (!cleanTitle || !cleanCompany || !cleanDesc) {
      setManualError('Please fill in Job Title, Company, and Job Description.');
      return;
    }

    const corpus = `${cleanTitle} ${cleanDesc}`.toLowerCase();
    const detectedSkills = Array.from(
      new Set([
        ...(userProfile.skills || []).filter((s) => corpus.includes(s.toLowerCase())),
        ...KNOWN_TECH_AND_WORKFLOW_TERMS.filter((t) => corpus.includes(t.toLowerCase())),
      ])
    ).slice(0, 8);

    const userSkillsLower = new Set((userProfile.skills || []).map((s) => s.toLowerCase()));
    const overlapCount = detectedSkills.filter((s) => userSkillsLower.has(s.toLowerCase())).length;
    const baselineScore =
      detectedSkills.length > 0
        ? Math.min(96, Math.max(62, Math.round(58 + (overlapCount / detectedSkills.length) * 38)))
        : 78;

    const newJob: JobListing = {
      id: `job_custom_${Date.now()}`,
      title: cleanTitle,
      company: cleanCompany,
      location: manualLocation.trim() || 'Remote',
      salary: 'See listing',
      jobType: 'Full-time',
      experienceReq: 'Per description',
      source: 'Direct Board',
      sourceUrl: manualUrl.trim() || 'https://www.linkedin.com/jobs/',
      postedDate: 'Added manually',
      description: cleanDesc,
      matchScore: baselineScore,
      matchReasoning:
        detectedSkills.length > 0
          ? `Detected ${detectedSkills.length} key skills in posting (${detectedSkills.slice(0, 4).join(', ')}). Run ATS Audit for deep scoring.`
          : 'Custom job description added. Click Run ATS Audit for a detailed score breakdown.',
      requiredSkills: detectedSkills.length > 0 ? detectedSkills : (userProfile.skills || []).slice(0, 4),
      applyMethod: 'company_portal',
      status: 'discovered',
      discoveredAt: new Date().toISOString(),
    };

    onAddManualJob(newJob);
    setManualTitle('');
    setManualCompany('');
    setManualLocation('Remote');
    setManualUrl('');
    setManualDescription('');
    setManualError(null);
    setIsAddingManualJob(false);
  };

  const visibleJobs = discoveredJobs.filter((job) => {
    if (statusFilter === 'pending') return job.status !== 'applied';
    if (statusFilter === 'applied') return job.status === 'applied';
    return true;
  });

  const activeError = searchError || analysisError || suggestionError;

  const searchPhaseLabel =
    searchElapsedSec < 6
      ? 'Pass 1/3 · Querying Indeed, LinkedIn & job boards...'
      : searchElapsedSec < 13
        ? 'Pass 2/3 · Scanning direct ATS & company career portals...'
        : 'Pass 3/3 · Deduplicating, filtering & scoring matches...';

  const suggestedTitlesToShow = (aiSuggestions?.suggestedTitles || []).filter(
    (t) => !titles.some((existing) => existing.toLowerCase() === t.toLowerCase())
  );
  const suggestedKeywordsToShow = (aiSuggestions?.suggestedKeywords || []).filter(
    (k) => !keywords.some((existing) => existing.toLowerCase() === k.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Page Header & Search Configuration Card */}
      <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-50 tracking-tight">Job Match Engine</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Search live openings across job boards and career portals, or paste any external listing for ATS scoring.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {onAddManualJob && (
              <button
                type="button"
                onClick={() => {
                  setIsAddingManualJob((prev) => !prev);
                  setManualError(null);
                }}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors whitespace-nowrap ${
                  isAddingManualJob
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 border-zinc-900 dark:border-zinc-100'
                    : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 hover:border-zinc-400 text-zinc-800 dark:text-zinc-100 shadow-2xs'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>{isAddingManualJob ? 'Close Paste Form' : 'Paste Job'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleFetchCvSuggestions}
              disabled={isSuggestingKeywords}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 hover:border-blue-500 text-zinc-800 dark:text-zinc-100 shadow-2xs transition-colors whitespace-nowrap disabled:opacity-50"
            >
              {isSuggestingKeywords ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              )}
              <span>{isSuggestingKeywords ? 'Analyzing CV...' : 'Suggest from CV'}</span>
            </button>

            <button
              type="button"
              onClick={handleTriggerSearch}
              disabled={isSearching}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
                isSearching
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm active:scale-[0.98]'
              }`}
            >
              {isSearching ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="tabular-nums">Searching ({searchElapsedSec}s)...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Search Live Jobs</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Manual Job Description Paste Form */}
        {isAddingManualJob && onAddManualJob && (
          <form
            onSubmit={handleCreateManualJob}
            className="p-5 sm:p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-4 text-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold text-base text-zinc-950 dark:text-zinc-100">
                Paste a Real Job Posting
              </div>
              <button
                type="button"
                onClick={() => setIsAddingManualJob(false)}
                aria-label="Close paste job form"
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-zinc-700 dark:text-zinc-300 font-medium block">Job Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Junior React Developer"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-zinc-700 dark:text-zinc-300 font-medium block">Company *</label>
                <input
                  type="text"
                  placeholder="e.g. Linear"
                  value={manualCompany}
                  onChange={(e) => setManualCompany(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-zinc-700 dark:text-zinc-300 font-medium block">Location</label>
                <input
                  type="text"
                  placeholder="Remote"
                  value={manualLocation}
                  onChange={(e) => setManualLocation(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-zinc-700 dark:text-zinc-300 font-medium block">Job URL (optional)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-zinc-700 dark:text-zinc-300 font-medium block">Job Description *</label>
              <textarea
                rows={4}
                placeholder="Paste the full job responsibilities and requirements here..."
                value={manualDescription}
                onChange={(e) => setManualDescription(e.target.value)}
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl p-3.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-blue-500 leading-relaxed"
              />
            </div>

            {manualError && <p className="text-red-600 dark:text-red-400 font-medium">{manualError}</p>}

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsAddingManualJob(false)}
                className="px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-950 font-semibold shadow-xs"
              >
                Add to Job List
              </button>
            </div>
          </form>
        )}

        {/* Active Multi-Pass Search Status Bar */}
        {isSearching && (
          <div className="px-5 py-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/70 flex items-center justify-between gap-4 text-sm">
            <span className="font-medium text-blue-900 dark:text-blue-200">{searchPhaseLabel}</span>
            <span className="font-mono text-blue-700 dark:text-blue-300 tabular-nums shrink-0">
              {searchElapsedSec}s elapsed
            </span>
          </div>
        )}

        {/* Titles & Keywords Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
          <div className="space-y-2">
            <label className="font-semibold text-zinc-800 dark:text-zinc-200 block">Target Job Titles</label>
            <div className="flex flex-wrap items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl min-h-[48px]">
              {titles.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 font-medium text-sm"
                >
                  <span>{t}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTitle(t)}
                    aria-label={`Remove ${t}`}
                    className="text-zinc-400 hover:text-red-600 dark:hover:text-red-400 p-0.5 rounded"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder="Type a title and press Enter..."
                value={newTitleInput}
                onChange={(e) => setNewTitleInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTitle())}
                className="bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none placeholder-zinc-400 dark:placeholder-zinc-500 text-sm px-1.5 py-1 flex-1 min-w-[160px]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-semibold text-zinc-800 dark:text-zinc-200 block">Required Skills &amp; Keywords</label>
            <div className="flex flex-wrap items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl min-h-[48px]">
              {keywords.map((k) => (
                <span
                  key={k}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 font-medium text-sm"
                >
                  <span>{k}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveKeyword(k)}
                    aria-label={`Remove ${k}`}
                    className="text-zinc-400 hover:text-red-600 dark:hover:text-red-400 p-0.5 rounded"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder="Type a skill and press Enter..."
                value={newKeywordInput}
                onChange={(e) => setNewKeywordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeyword())}
                className="bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none placeholder-zinc-400 dark:placeholder-zinc-500 text-sm px-1.5 py-1 flex-1 min-w-[160px]"
              />
            </div>
          </div>
        </div>

        {/* Clickable CV Keyword & Role Suggestions Strip */}
        {(localCvSignals.length > 0 || suggestedTitlesToShow.length > 0 || suggestedKeywordsToShow.length > 0) && (
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                Click any suggestion below to add it to your search
                {aiSuggestions?.searchStrategyNote && (
                  <span className="font-normal text-zinc-500 dark:text-zinc-400 ml-2">
                    — {aiSuggestions.searchStrategyNote}
                  </span>
                )}
              </div>

              {(suggestedTitlesToShow.length > 0 || suggestedKeywordsToShow.length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    suggestedTitlesToShow.forEach((t) => handleAddTitle(t));
                    suggestedKeywordsToShow.forEach((k) => handleAddKeyword(k));
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add All AI Suggestions</span>
                </button>
              )}
            </div>

            {suggestedTitlesToShow.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-zinc-500 dark:text-zinc-400 font-medium mr-1">Add title:</span>
                {suggestedTitlesToShow.map((title) => (
                  <button
                    key={title}
                    type="button"
                    onClick={() => handleAddTitle(title)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800 font-medium text-sm transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{title}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-zinc-500 dark:text-zinc-400 font-medium mr-1">
                {suggestedKeywordsToShow.length > 0 ? 'Add CV skill:' : 'Add from CV:'}
              </span>
              {(suggestedKeywordsToShow.length > 0 ? suggestedKeywordsToShow : localCvSignals).map((kw) => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => handleAddKeyword(kw)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800 font-medium text-sm transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{kw}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filter Controls */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-sm pt-4 border-t border-zinc-200 dark:border-zinc-800 items-end">
          <div className="space-y-1.5">
            <label className="text-zinc-600 dark:text-zinc-400 font-medium block">Location</label>
            <select
              value={filters.locationType}
              onChange={(e) => handleFilterChange('locationType', e.target.value)}
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
            >
              <option value="remote_only">Remote / Worldwide</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">On-site</option>
              <option value="all">All Locations</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-zinc-600 dark:text-zinc-400 font-medium block">Experience</label>
            <select
              value={filters.experienceLevel}
              onChange={(e) => handleFilterChange('experienceLevel', e.target.value)}
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
            >
              <option value="fresher">Fresher (0-1 yrs)</option>
              <option value="entry">Entry (0-2 yrs)</option>
              <option value="mid">Mid (2-5 yrs)</option>
              <option value="senior">Senior (5+ yrs)</option>
              <option value="all">All Levels</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-zinc-600 dark:text-zinc-400 font-medium block">Job Type</label>
            <select
              value={filters.jobType}
              onChange={(e) => handleFilterChange('jobType', e.target.value)}
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="fulltime">Full-time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
              <option value="parttime">Part-time</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-zinc-600 dark:text-zinc-400 font-medium block">Posted</label>
            <select
              value={filters.datePosted}
              onChange={(e) => handleFilterChange('datePosted', e.target.value)}
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
            >
              <option value="anytime">Any time</option>
              <option value="24h">Last 24 hours</option>
              <option value="3d">Last 3 days</option>
              <option value="7d">Last 7 days</option>
              <option value="14d">Last 14 days</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-zinc-600 dark:text-zinc-400 font-medium block">Min Salary</label>
            <select
              value={filters.minSalary}
              onChange={(e) => handleFilterChange('minSalary', e.target.value)}
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
            >
              <option value="any">Any salary</option>
              <option value="40k">$40,000+</option>
              <option value="60k">$60,000+</option>
              <option value="80k">$80,000+</option>
              <option value="100k">$100,000+</option>
            </select>
          </div>

          <label className="flex items-center gap-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 cursor-pointer h-[42px]">
            <input
              type="checkbox"
              checked={Boolean(filters.nonVoiceOnly)}
              onChange={(e) => handleFilterChange('nonVoiceOnly', e.target.checked)}
              className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-zinc-800 dark:text-zinc-200 font-medium truncate">Non-voice only</span>
          </label>
        </div>
      </section>

      {/* Error Notice */}
      {activeError && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/70 rounded-2xl px-5 py-4 text-sm text-red-800 dark:text-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-medium block">{activeError}</span>
              {searchError && onAddManualJob && (
                <p className="text-red-700 dark:text-red-300">
                  Tip: You can paste any job posting directly to run ATS Audits and generate tailored PDF resumes.
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="px-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 font-semibold hover:bg-red-100/60 dark:hover:bg-red-900/40 whitespace-nowrap"
              >
                Provider Settings
              </button>
            )}
            {searchError && onAddManualJob && (
              <button
                type="button"
                onClick={() => {
                  setIsAddingManualJob(true);
                  onDismissError();
                }}
                className="px-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 font-semibold hover:bg-red-100/60 dark:hover:bg-red-900/40 whitespace-nowrap"
              >
                Paste Job Instead
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onDismissError();
                setAnalysisError(null);
                setSuggestionError(null);
              }}
              aria-label="Dismiss error"
              className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-200 p-1.5 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Last Multi-Pass Search Summary */}
      {lastSearchStats && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-6 py-4 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-600 dark:text-zinc-300">
          <span className="tabular-nums">
            <strong className="text-zinc-950 dark:text-zinc-100">{lastSearchStats.passesExecuted} search passes</strong>
            {' · '}
            {lastSearchStats.groundingSourcesCount} grounded sources checked
            {' · '}
            {lastSearchStats.verifiedCount} verified listings added in{' '}
            {(lastSearchStats.durationMs / 1000).toFixed(1)}s
          </span>
          {lastSearchStats.auditSummary && (
            <span className="text-zinc-500 dark:text-zinc-400 truncate max-w-md">
              {lastSearchStats.auditSummary}
            </span>
          )}
        </div>
      )}

      {/* Results Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-zinc-950 dark:text-zinc-50 tabular-nums">
          Discovered Openings ({visibleJobs.length})
        </h2>

        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          {onUpdateScreenedJobs && discoveredJobs.length > 0 && (
            <button
              type="button"
              onClick={handleBatchDecisionScreen}
              disabled={isBatchScreening}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-zinc-800 dark:text-zinc-100 shadow-2xs transition-colors whitespace-nowrap disabled:opacity-50"
            >
              {isBatchScreening ? (
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
              ) : (
                <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              )}
              <span>{isBatchScreening ? 'Calibrating...' : 'Calibrate Fit (AI)'}</span>
            </button>
          )}

          <div className="flex items-center gap-1 p-1 bg-zinc-200/80 dark:bg-zinc-800 rounded-xl">
            {([
              { id: 'all', label: 'All' },
              { id: 'pending', label: 'Not Prepared' },
              { id: 'applied', label: 'Prepared' },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-1.5 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-50 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Job Cards List */}
      <div className="space-y-5">
        {visibleJobs.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center space-y-2">
            <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">No job listings match this filter</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Adjust your search parameters above and click Search Live Jobs to fetch fresh openings.
            </p>
          </div>
        ) : (
          visibleJobs.map((job) => {
            const quickKeywords = computeQuickKeywords(job);
            const analysis = compatibilityMap[job.id];
            const isAnalyzingThis = analyzingJobId === job.id;
            const isExpanded = expandedAnalysisJobId === job.id;
            const isThisJobPreparing = isAgentRunning && activeJobId === job.id;

            return (
              <article
                key={job.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-2xs"
              >
                <div className="p-6 sm:p-7 space-y-5">
                  {/* Top Header Row: Title + Unboxed Metadata + Match Score */}
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-1.5 min-w-0">
                      <h3 className="text-lg sm:text-xl font-bold text-zinc-950 dark:text-zinc-50 leading-snug">
                        {job.title}
                      </h3>
                      <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">{job.company}</span>
                        <span aria-hidden="true">·</span>
                        <span>{job.location}</span>
                        <span aria-hidden="true">·</span>
                        <span>{job.salary}</span>
                        <span aria-hidden="true">·</span>
                        <span>{job.jobType}</span>
                        <span aria-hidden="true">·</span>
                        <span>{job.source}</span>
                        <span aria-hidden="true">·</span>
                        <span>Posted {job.postedDate}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-base font-bold text-zinc-950 dark:text-zinc-50 tabular-nums">
                        {analysis?.overallScore || job.matchScore}% match
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemoveJob(job.id)}
                        title="Dismiss listing"
                        aria-label={`Remove ${job.title}`}
                        className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-800 hover:bg-red-50/50 dark:hover:bg-red-950/30 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Description & AI Fit Evaluation Split */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-sm">
                    <div className="md:col-span-7 space-y-1.5">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">Role Summary</div>
                      <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-3">
                        {job.description}
                      </p>
                    </div>
                    <div className="md:col-span-5 space-y-1.5">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">Fit Assessment</div>
                      <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">{job.matchReasoning}</p>
                      {(analysis?.decisionCalibration || job.decisionCalibration) && (
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 pt-1 tabular-nums">
                          {(() => {
                            const dc = analysis?.decisionCalibration || job.decisionCalibration!;
                            return `${dc.model}: ${dc.shouldApplyProbability}% apply fit · ${dc.confidence}% confidence`;
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Skill Overlap Line & Tactile ATS Audit Button */}
                  <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm">
                    <div className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 mr-2">Skills:</span>
                      {quickKeywords.matched.length > 0 && (
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                          Matched ({quickKeywords.matched.join(', ')})
                        </span>
                      )}
                      {quickKeywords.matched.length > 0 && quickKeywords.missing.length > 0 && (
                        <span className="mx-2 text-zinc-300 dark:text-zinc-700">·</span>
                      )}
                      {quickKeywords.missing.length > 0 && (
                        <span className="text-zinc-500 dark:text-zinc-400">
                          To highlight ({quickKeywords.missing.join(', ')})
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAnalyzeCompatibility(job)}
                      disabled={isAnalyzingThis}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-blue-700 dark:text-blue-300 shadow-2xs transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span>
                        {isAnalyzingThis ? 'Auditing...' : isExpanded ? 'Hide ATS Audit' : 'Run ATS Audit'}
                      </span>
                    </button>
                  </div>

                  {/* Expandable ATS Audit Breakdown */}
                  {isExpanded && analysis && (
                    <div className="pt-5 border-t border-zinc-200 dark:border-zinc-800 space-y-5 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-1">
                          <span className="font-bold text-base text-zinc-950 dark:text-zinc-50 block">
                            ATS Compatibility Breakdown
                          </span>
                          {analysis.decisionCalibration && (
                            <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums block">
                              Calibrated by {analysis.decisionCalibration.model} · Apply fit{' '}
                              {analysis.decisionCalibration.shouldApplyProbability}% ·{' '}
                              {analysis.decisionCalibration.confidence}% confidence
                              {analysis.decisionCalibration.seniorityTrack
                                ? ` · Track: ${analysis.decisionCalibration.seniorityTrack}`
                                : ''}
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-base font-bold text-zinc-950 dark:text-zinc-50 tabular-nums">
                          {analysis.overallScore}% overall
                        </span>
                      </div>

                      {analysis.scoreBreakdown && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 py-4 border-y border-zinc-200 dark:border-zinc-800">
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Skills</div>
                            <div className="text-lg font-mono font-bold text-zinc-950 dark:text-zinc-50 tabular-nums">
                              {analysis.scoreBreakdown.skillsMatchScore}%
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Experience</div>
                            <div className="text-lg font-mono font-bold text-zinc-950 dark:text-zinc-50 tabular-nums">
                              {analysis.scoreBreakdown.experienceMatchScore}%
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Education</div>
                            <div className="text-lg font-mono font-bold text-zinc-950 dark:text-zinc-50 tabular-nums">
                              {analysis.scoreBreakdown.educationMatchScore}%
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Domain</div>
                            <div className="text-lg font-mono font-bold text-zinc-950 dark:text-zinc-50 tabular-nums">
                              {analysis.scoreBreakdown.domainKnowledgeScore}%
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100">Matched Requirements</div>
                          <ul className="space-y-1.5 text-zinc-600 dark:text-zinc-400 list-disc list-inside leading-relaxed">
                            {(analysis.matchedRequirements || []).map((m, i) => (
                              <li key={i}>{m}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="space-y-2">
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                            CV Tailoring Recommendations
                          </div>
                          <ul className="space-y-1.5 text-zinc-600 dark:text-zinc-400 list-disc list-inside leading-relaxed">
                            {(analysis.gapRecommendations || []).map((r, i) => (
                              <li key={i}>{r}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Action Bar */}
                <div className="px-6 sm:px-7 py-4 bg-zinc-50/90 dark:bg-zinc-950/70 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                  <a
                    href={job.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium underline underline-offset-4 self-start sm:self-auto"
                  >
                    <span>Open original listing ({job.source})</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <div className="flex flex-wrap items-center gap-2.5 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setSelectedJobForModal(job)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 hover:border-zinc-400 text-zinc-800 dark:text-zinc-100 font-semibold shadow-2xs transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Full Details</span>
                    </button>

                    {job.status === 'applied' ? (
                      <button
                        type="button"
                        onClick={onGoToApplications}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        <span>View Prepared Package</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onApplySingleJob(job)}
                        disabled={isAgentRunning}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all ${
                          isAgentRunning
                            ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 cursor-not-allowed'
                            : 'bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-950 shadow-xs active:scale-[0.98]'
                        }`}
                      >
                        {isThisJobPreparing ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Preparing...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Prepare Package</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Job Details Modal */}
      {selectedJobForModal && (
        <div className="fixed inset-0 z-50 bg-zinc-950/50 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-2xl w-full p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-start justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <div className="space-y-1 pr-4">
                <h3 className="text-xl font-bold text-zinc-950 dark:text-zinc-50">{selectedJobForModal.title}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {selectedJobForModal.company} · {selectedJobForModal.location} · {selectedJobForModal.salary}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJobForModal(null)}
                aria-label="Close job details"
                className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              <div className="grid grid-cols-3 gap-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                <div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 block">Work Type</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{selectedJobForModal.jobType}</span>
                </div>
                <div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 block">Experience</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {selectedJobForModal.experienceReq}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 block">Source</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{selectedJobForModal.source}</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-zinc-950 dark:text-zinc-50 block">Full Description</span>
                <p className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {selectedJobForModal.description}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setSelectedJobForModal(null)}
                className="px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100 font-semibold text-sm"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  const j = selectedJobForModal;
                  setSelectedJobForModal(null);
                  onApplySingleJob(j);
                }}
                disabled={isAgentRunning}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Prepare Package</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
