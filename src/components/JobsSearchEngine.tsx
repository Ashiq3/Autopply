import React, { useState } from 'react';
import { 
  Search, 
  Sparkles, 
  Briefcase, 
  ExternalLink, 
  Play, 
  FileText, 
  CheckCircle2, 
  Building2, 
  Globe, 
  Clock, 
  X,
  Plus,
  Calendar,
  DollarSign,
  Award,
  MapPin,
  SlidersHorizontal,
  BarChart3,
  Target,
  ShieldCheck,
  Check,
  CheckCircle
} from 'lucide-react';
import { JobListing, UserProfile, IndeedFilterState, JobCompatibilityAnalysis } from '../types';

interface JobsSearchEngineProps {
  discoveredJobs: JobListing[];
  userProfile: UserProfile;
  isSearching: boolean;
  onSearchJobs: (searchParams: any) => void;
  onApplySingleJob: (job: JobListing) => void;
  onTailorSingleJob: (job: JobListing) => void;
}

export const JobsSearchEngine: React.FC<JobsSearchEngineProps> = ({
  discoveredJobs,
  userProfile,
  isSearching,
  onSearchJobs,
  onApplySingleJob,
  onTailorSingleJob
}) => {
  const [titles, setTitles] = useState<string[]>(
    userProfile.targetJobTitles && userProfile.targetJobTitles.length > 0
      ? userProfile.targetJobTitles
      : [
          'Lead Generation Specialist',
          'Email Marketing Specialist',
          'Mailchimp Specialist',
          'Email Automation Specialist',
          'Sheet Automation Specialist',
          'AI Automation Specialist'
        ]
  );
  const [newTitleInput, setNewTitleInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>(
    userProfile.skills && userProfile.skills.length > 0
      ? userProfile.skills
      : [
          'Lead Generation', 'Email Marketing', 'Mailchimp', 'Email Automation',
          'Sheet Automation', 'Data Entry', 'AI Automation', 'AI Agent Build'
        ]
  );
  const [selectedJobForModal, setSelectedJobForModal] = useState<JobListing | null>(null);

  // Job Compatibility & Keyword Parser States
  const [compatibilityMap, setCompatibilityMap] = useState<Record<string, JobCompatibilityAnalysis>>({});
  const [analyzingJobId, setAnalyzingJobId] = useState<string | null>(null);
  const [expandedAnalysisJobId, setExpandedAnalysisJobId] = useState<string | null>(null);

  // Indeed Search Filters
  const [filters, setFilters] = useState<IndeedFilterState>({
    datePosted: 'anytime',
    jobType: 'all',
    experienceLevel: 'fresher',
    minSalary: 'any',
    locationType: 'remote_only',
    companyType: 'direct_only',
    sortBy: 'relevance',
    radius: 'exact'
  });

  const handleAddTitle = () => {
    if (newTitleInput.trim() && !titles.includes(newTitleInput.trim())) {
      setTitles([...titles, newTitleInput.trim()]);
      setNewTitleInput('');
    }
  };

  const handleRemoveTitle = (tToRemove: string) => {
    setTitles(titles.filter(t => t !== tToRemove));
  };

  const handleFilterChange = (field: keyof IndeedFilterState, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
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
      sortBy: filters.sortBy
    });
  };

  // Helper for fast client-side keyword matching
  const computeQuickKeywords = (job: JobListing) => {
    const userSkillsNormalized = (userProfile.skills || []).map(s => s.toLowerCase());
    const reqSkills = job.requiredSkills || [];

    const matched = reqSkills.filter(s =>
      userSkillsNormalized.some(us => us.includes(s.toLowerCase()) || s.toLowerCase().includes(us))
    );
    const missing = reqSkills.filter(s => !matched.includes(s));

    return { matched, missing };
  };

  // AI Deep Compatibility Audit Handler
  const handleAnalyzeCompatibility = async (job: JobListing) => {
    if (compatibilityMap[job.id]) {
      setExpandedAnalysisJobId(expandedAnalysisJobId === job.id ? null : job.id);
      return;
    }

    setAnalyzingJobId(job.id);
    setExpandedAnalysisJobId(job.id);

    try {
      const res = await fetch('/api/agent/analyze-job-compatibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job,
          userProfile
        })
      });

      const data = await res.json();
      if (data.success && data.analysis) {
        setCompatibilityMap(prev => ({
          ...prev,
          [job.id]: data.analysis
        }));
      }
    } catch (err) {
      // Fallback
    } finally {
      setAnalyzingJobId(null);
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Search Header Bento Module */}
      <div className="bento-card bg-slate-900 border-slate-800 space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-indigo-400" />
              Job Match Search Engine
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live Google Search Grounding for Remote Lead Generation, Mailchimp, Sheet & AI Automation roles.
            </p>
          </div>

          <button
            onClick={handleTriggerSearch}
            disabled={isSearching}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold shadow-md flex items-center space-x-1.5 shrink-0 ${
              isSearching
                ? 'bg-indigo-950 text-indigo-300 border border-indigo-800 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white active:scale-95'
            }`}
          >
            {isSearching ? (
              <span>Searching Open Listings...</span>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" />
                <span>Search Live Opportunities</span>
              </>
            )}
          </button>
        </div>

        {/* Target Job Titles Input */}
        <div className="space-y-1.5 text-xs">
          <label className="font-semibold text-slate-300 block">Target Job Titles</label>
          <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-950 border border-slate-800 rounded-xl min-h-[40px]">
            {titles.map((t) => (
              <span key={t} className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                <span>{t}</span>
                <button onClick={() => handleRemoveTitle(t)} className="hover:text-rose-400">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <input
              type="text"
              placeholder="Add title..."
              value={newTitleInput}
              onChange={(e) => setNewTitleInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTitle())}
              className="bg-transparent text-slate-200 focus:outline-none placeholder-slate-500 text-xs px-2 py-0.5 flex-1 min-w-[120px]"
            />
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1 border-t border-slate-800/80">
          
          <div className="space-y-1">
            <label className="text-slate-400 font-medium">Work Location</label>
            <select
              value={filters.locationType}
              onChange={(e) => handleFilterChange('locationType', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none"
            >
              <option value="remote_only">100% Remote / Worldwide</option>
              <option value="all">All Locations</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 font-medium">Experience Level</label>
            <select
              value={filters.experienceLevel}
              onChange={(e) => handleFilterChange('experienceLevel', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none"
            >
              <option value="fresher">Fresher / Beginner (0-2 Yrs)</option>
              <option value="entry">Entry Level / Lead Gen (2+ Yrs)</option>
              <option value="all">All Levels</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 font-medium">Date Posted</label>
            <select
              value={filters.datePosted}
              onChange={(e) => handleFilterChange('datePosted', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none"
            >
              <option value="anytime">Any Time</option>
              <option value="24h">Last 24 Hours</option>
              <option value="3d">Last 3 Days</option>
              <option value="7d">Last 7 Days</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 font-medium">Minimum Salary</label>
            <select
              value={filters.minSalary}
              onChange={(e) => handleFilterChange('minSalary', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none"
            >
              <option value="any">Any Salary</option>
              <option value="40k">$40,000+ / year</option>
              <option value="60k">$60,000+ / year</option>
              <option value="80k">$80,000+ / year</option>
            </select>
          </div>

        </div>

      </div>

      {/* Discovered Opportunities Title Bar */}
      <div className="flex items-center justify-between px-1">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-indigo-400" />
          Discovered Opportunities ({discoveredJobs.length})
        </h3>
        <span className="text-xs text-slate-400">
          Showing filtered non-voice, remote job listings
        </span>
      </div>

      {/* Bento Grid Jobs List */}
      <div className="grid grid-cols-1 gap-4">
        {discoveredJobs.map((job) => {
          const quickKeywords = computeQuickKeywords(job);
          const analysis = compatibilityMap[job.id];
          const isAnalyzingThis = analyzingJobId === job.id;
          const isExpanded = expandedAnalysisJobId === job.id;

          return (
            <div 
              key={job.id} 
              className="bento-card bg-slate-900 border-slate-800 hover:border-slate-700 transition-all space-y-3"
            >
              {/* Bento Row 1: Title, Company, Location, Match Badge */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start border-b border-slate-800/80 pb-3">
                <div className="md:col-span-8 space-y-1">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <h4 className="text-base font-bold text-white">
                      {job.title}
                    </h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                      Source: {job.source}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                      100% Non-Voice / Remote
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 text-xs text-slate-400 pt-0.5">
                    <span className="font-semibold text-slate-200 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {job.company}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                      {job.location}
                    </span>
                    <span>•</span>
                    <span className="text-emerald-400 font-semibold">{job.salary}</span>
                  </div>
                </div>

                <div className="md:col-span-4 flex md:flex-col items-center md:items-end justify-between gap-1.5">
                  <span className="px-3 py-1 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-bold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>{analysis?.overallScore || job.matchScore}% Candidate Fit</span>
                  </span>
                  <span className="text-[11px] text-slate-500">Posted {job.postedDate}</span>
                </div>
              </div>

              {/* Bento Row 2: Description & Fit Reasoning Bento Tiles */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                
                {/* Description Tile */}
                <div className="md:col-span-7 bento-tile bg-slate-950/70 border-slate-800 space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">Job Description & Requirements</span>
                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                    {job.description}
                  </p>
                </div>

                {/* Match Reasoning Tile */}
                <div className="md:col-span-5 bento-tile bg-slate-950/70 border-slate-800 space-y-1">
                  <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wide block flex items-center gap-1">
                    <Target className="w-3.5 h-3.5" />
                    AI Match Evaluation
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {job.matchReasoning}
                  </p>
                </div>

              </div>

              {/* Bento Row 3: Skills & Tech Stack Bento Tile */}
              <div className="bento-tile bg-slate-950/50 border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-slate-400 font-semibold text-[11px]">Matched Skills:</span>
                  {quickKeywords.matched.map((s, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded text-[11px] bg-emerald-950 text-emerald-300 border border-emerald-800">
                      ✓ {s}
                    </span>
                  ))}
                  {quickKeywords.missing.map((s, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded text-[11px] bg-slate-900 text-slate-400 border border-slate-800">
                      {s}
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => handleAnalyzeCompatibility(job)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>{isAnalyzingThis ? 'Analyzing...' : isExpanded ? 'Hide AI Audit' : 'Audit Fit Breakdown'}</span>
                </button>
              </div>

              {/* Deep AI Audit Expansion Box */}
              {isExpanded && analysis && (
                <div className="bento-tile bg-indigo-950/20 border-indigo-800/60 space-y-3 text-xs animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-indigo-900/60 pb-2">
                    <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      Detailed Candidate Audit Breakdown
                    </span>
                    <span className="text-emerald-400 font-bold">{analysis.overallScore}% Fit Score</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                    <div className="space-y-1">
                      <span className="font-bold text-slate-300 block">Matching Requirements</span>
                      <ul className="space-y-0.5 text-slate-300 list-disc list-inside">
                        {analysis.matchingRequirements.map((m, i) => <li key={i}>{m}</li>)}
                      </ul>
                    </div>

                    <div className="space-y-1">
                      <span className="font-bold text-slate-300 block">CV Tailoring Recommendations</span>
                      <ul className="space-y-0.5 text-indigo-200 list-disc list-inside">
                        {analysis.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Bento Row 4: Action Buttons Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-800/80 text-xs">
                <a
                  href={job.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-slate-200 flex items-center gap-1"
                >
                  <span>View Original Listing ({job.source})</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <div className="flex items-center space-x-2 self-end sm:self-auto">
                  <button
                    onClick={() => setSelectedJobForModal(job)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium flex items-center space-x-1"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View Details</span>
                  </button>

                  <button
                    onClick={() => onApplySingleJob(job)}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center space-x-1.5 shadow-sm"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Auto-Apply with Tailored CV</span>
                  </button>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Modal for Job Details */}
      {selectedJobForModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedJobForModal.title}</h3>
                <p className="text-xs text-slate-400">{selectedJobForModal.company} • {selectedJobForModal.location}</p>
              </div>
              <button 
                onClick={() => setSelectedJobForModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-indigo-300 block">Salary & Role Overview</span>
                <p>Salary: <span className="text-emerald-400 font-bold">{selectedJobForModal.salary}</span></p>
                <p>Work Type: {selectedJobForModal.jobType} (100% Remote, Non-Voice)</p>
                <p>Experience: {selectedJobForModal.experienceReq}</p>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-white block">Full Job Description</span>
                <p className="whitespace-pre-wrap bg-slate-950 p-3 rounded-xl border border-slate-800">
                  {selectedJobForModal.description}
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedJobForModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium text-xs"
              >
                Close
              </button>

              <button
                onClick={() => {
                  const j = selectedJobForModal;
                  setSelectedJobForModal(null);
                  onApplySingleJob(j);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center space-x-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Submit Tailored Application</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
