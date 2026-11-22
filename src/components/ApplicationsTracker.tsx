import React, { useState, useEffect } from 'react';
import {
  Download,
  Search,
  X,
  ListTodo,
  Trash2,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { ApplicationRecord, UserProfile } from '../types';
import { generateResumePDF } from '../utils/pdfGenerator';

const FOLLOW_UP_STORAGE_KEY = 'autoapply_followup_marks_v1';

interface ApplicationsTrackerProps {
  applications: ApplicationRecord[];
  userProfile: UserProfile;
  onUpdateStatus?: (appId: string, newStatus: ApplicationRecord['status']) => void;
  onDeleteApplication?: (appId: string) => void;
}

const STATUS_OPTIONS: { value: ApplicationRecord['status']; label: string }[] = [
  { value: 'applied', label: 'Applied' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'interview_scheduled', label: 'Interview Scheduled' },
  { value: 'action_required', label: 'Action Required' },
  { value: 'rejected', label: 'Rejected' },
];

export const ApplicationsTracker: React.FC<ApplicationsTrackerProps> = ({
  applications,
  userProfile,
  onUpdateStatus,
  onDeleteApplication,
}) => {
  const [selectedApp, setSelectedApp] = useState<ApplicationRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ApplicationRecord['status']>('all');
  const [activeTabModal, setActiveTabModal] = useState<'resume' | 'cover' | 'form'>('resume');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [followUpMarks, setFollowUpMarks] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(FOLLOW_UP_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(FOLLOW_UP_STORAGE_KEY, JSON.stringify(followUpMarks));
    } catch {
      // Ignore storage quota errors
    }
  }, [followUpMarks]);

  const filteredApps = applications.filter((app) => {
    const matchesQuery =
      app.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.status.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const handleToggleFollowUp = (appId: string) => {
    setFollowUpMarks((prev) => ({ ...prev, [appId]: !prev[appId] }));
  };

  const handleCopyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((curr) => (curr === key ? null : curr)), 2000);
    } catch {
      // Clipboard API unavailable
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Search */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-50 tracking-tight">Applications</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Track submission statuses and inspect tailored resumes, cover letters, and ATS form mappings.
          </p>
        </div>

        <div className="relative min-w-[280px]">
          <Search className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Filter by company or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-950"
          />
        </div>
      </div>

      {/* Status Filter Segmented Bar */}
      <div className="flex items-center gap-1.5 p-1 bg-zinc-200/80 dark:bg-zinc-800 rounded-xl overflow-x-auto w-fit max-w-full">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`px-3.5 py-1.5 text-sm font-semibold rounded-lg whitespace-nowrap transition-colors ${
            statusFilter === 'all'
              ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-50 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
          }`}
        >
          All ({applications.length})
        </button>
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setStatusFilter(opt.value)}
            className={`px-3.5 py-1.5 text-sm font-semibold rounded-lg whitespace-nowrap transition-colors ${
              statusFilter === opt.value
                ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-50 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Applications List */}
      <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-2xs">
        {filteredApps.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">No applications found</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Prepare an application package from Job Search or Overview to populate this log.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filteredApps.map((app) => (
              <div
                key={app.id}
                className="p-6 sm:p-7 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-5"
              >
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center flex-wrap gap-3">
                    <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">{app.jobTitle}</h2>
                    {onUpdateStatus ? (
                      <select
                        value={app.status}
                        onChange={(e) =>
                          onUpdateStatus(app.id, e.target.value as ApplicationRecord['status'])
                        }
                        aria-label={`Status for ${app.jobTitle}`}
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                        {app.status.replace('_', ' ')}
                      </span>
                    )}
                  </div>

                  <div className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center flex-wrap gap-x-2.5 gap-y-1">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{app.company}</span>
                    <span aria-hidden="true">·</span>
                    <span>{app.location}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                      {app.matchScore}% match
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">Saved {new Date(app.appliedAt).toLocaleDateString()}</span>
                  </div>

                  <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate max-w-2xl">
                    {app.confirmationDetails}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleFollowUp(app.id)}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                      followUpMarks[app.id]
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                        : 'bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 shadow-2xs'
                    }`}
                  >
                    <ListTodo className="w-4 h-4" />
                    <span>{followUpMarks[app.id] ? 'Follow-up Noted' : 'Follow-up'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => generateResumePDF(userProfile.fullName, app.company, app.tailoredCV)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 hover:border-zinc-400 text-zinc-800 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 shadow-2xs transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedApp(app)}
                    className="px-4 py-2 rounded-xl text-sm font-semibold bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-950 shadow-xs transition-colors"
                  >
                    Inspect Package
                  </button>

                  {onDeleteApplication && (
                    <button
                      type="button"
                      onClick={() => onDeleteApplication(app.id)}
                      title="Delete application"
                      aria-label={`Delete application for ${app.jobTitle}`}
                      className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-800 hover:bg-red-50/50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Package Inspector Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-zinc-950/50 backdrop-blur-[1px] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-3xl w-full p-6 sm:p-7 space-y-5 shadow-xl relative my-8">
            <button
              type="button"
              onClick={() => setSelectedApp(null)}
              aria-label="Close inspector"
              className="absolute right-5 top-5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1.5 pr-12">
              <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                {selectedApp.company} · {selectedApp.status.replace('_', ' ')}
              </div>
              <h3 className="text-xl font-bold text-zinc-950 dark:text-zinc-50">{selectedApp.jobTitle}</h3>
              <div className="flex items-center flex-wrap gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                <span className="tabular-nums">Prepared {new Date(selectedApp.appliedAt).toLocaleString()}</span>
                {selectedApp.companyCareerPageUrl && (
                  <>
                    <span aria-hidden="true">·</span>
                    <a
                      href={selectedApp.companyCareerPageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium underline underline-offset-4"
                    >
                      <span>Open Career Portal</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </>
                )}
              </div>
            </div>

            <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-6">
              <button
                type="button"
                onClick={() => setActiveTabModal('resume')}
                className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
                  activeTabModal === 'resume'
                    ? 'border-blue-600 text-zinc-950 dark:text-zinc-50'
                    : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                Tailored Resume
              </button>
              <button
                type="button"
                onClick={() => setActiveTabModal('cover')}
                className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
                  activeTabModal === 'cover'
                    ? 'border-blue-600 text-zinc-950 dark:text-zinc-50'
                    : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                Cover Letter
              </button>
              <button
                type="button"
                onClick={() => setActiveTabModal('form')}
                className={`pb-3 text-sm font-semibold border-b-2 transition-colors tabular-nums ${
                  activeTabModal === 'form'
                    ? 'border-blue-600 text-zinc-950 dark:text-zinc-50'
                    : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                ATS Form Fields ({selectedApp.formFieldsFilled.length})
              </button>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-950 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-800 dark:text-zinc-200 max-h-96 overflow-y-auto leading-relaxed">
              {activeTabModal === 'resume' && (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleCopyText('resume', selectedApp.tailoredCV)}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-100 shadow-2xs"
                    >
                      {copiedKey === 'resume' ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy Markdown CV</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="whitespace-pre-wrap font-mono text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
                    {selectedApp.tailoredCV}
                  </div>
                </div>
              )}

              {activeTabModal === 'cover' && (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleCopyText('cover', selectedApp.tailoredCoverLetter)}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-100 shadow-2xs"
                    >
                      {copiedKey === 'cover' ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy Cover Letter</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
                    {selectedApp.tailoredCoverLetter}
                  </div>
                </div>
              )}

              {activeTabModal === 'form' && (
                <div className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                  {selectedApp.formFieldsFilled.map((field, idx) => (
                    <div key={idx} className="p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-zinc-950 dark:text-zinc-50">{field.fieldLabel}</span>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                            {field.fieldType}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyText(`field_${idx}`, field.valueToFill)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100"
                          >
                            {copiedKey === `field_${idx}` ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      <p className="font-mono text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800">
                        {field.valueToFill}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">{field.explanation}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => generateResumePDF(userProfile.fullName, selectedApp.company, selectedApp.tailoredCV)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Export PDF Resume</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-zinc-800 dark:text-zinc-100 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
