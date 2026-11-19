import React, { useState } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  Download, 
  ExternalLink, 
  Search, 
  Calendar, 
  Clock, 
  Building2, 
  User, 
  Mail, 
  FileCheck, 
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  X,
  ListTodo,
  Sparkles
} from 'lucide-react';
import { ApplicationRecord, UserProfile } from '../types';
import { generateResumePDF } from '../utils/pdfGenerator';

interface ApplicationsTrackerProps {
  applications: ApplicationRecord[];
  userProfile: UserProfile;
  onUpdateStatus?: (appId: string, newStatus: any) => void;
}

export const ApplicationsTracker: React.FC<ApplicationsTrackerProps> = ({
  applications,
  userProfile,
  onUpdateStatus
}) => {
  const [selectedApp, setSelectedApp] = useState<ApplicationRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTabModal, setActiveTabModal] = useState<'resume' | 'cover' | 'form'>('resume');
  const [syncedTasks, setSyncedTasks] = useState<Record<string, boolean>>({});

  const filteredApps = applications.filter(app => 
    app.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSyncTask = (app: ApplicationRecord) => {
    setSyncedTasks(prev => ({ ...prev, [app.id]: true }));
  };

  return (
    <div className="space-y-6">
      
      {/* Tracker Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            Submitted Applications Log
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Every application is stored with its unique tailored resume, cover letter, and ATS form mapping proof.
          </p>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search company or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Applications Table / Cards List */}
      <div className="space-y-3">
        {filteredApps.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
            <FileText className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-medium">No applications found matching search.</p>
            <p className="text-xs text-slate-500">Run the AutoApply AI Agent from the dashboard to submit applications.</p>
          </div>
        ) : (
          filteredApps.map((app) => (
            <div 
              key={app.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg transition-all space-y-4"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-base text-white">{app.jobTitle}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {app.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 text-xs text-slate-400">
                    <span className="font-semibold text-slate-200">{app.company}</span>
                    <span>•</span>
                    <span>{app.location}</span>
                    <span>•</span>
                    <span className="text-indigo-400 font-medium">{app.matchScore}% Match Score</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 self-end md:self-auto">
                  
                  {/* Google Tasks Sync */}
                  <button
                    onClick={() => handleSyncTask(app)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center space-x-1.5 ${
                      syncedTasks[app.id]
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                  >
                    <ListTodo className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{syncedTasks[app.id] ? 'Synced to Google Tasks' : 'Sync Google Task'}</span>
                  </button>

                  <button
                    onClick={() => generateResumePDF(userProfile.fullName, app.company, app.tailoredCV)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-950 text-indigo-300 border border-indigo-700/50 hover:bg-indigo-900 transition-all flex items-center space-x-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF CV</span>
                  </button>

                  <button
                    onClick={() => setSelectedApp(app)}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all"
                  >
                    Inspect Full Package
                  </button>

                </div>

              </div>

              {/* Confirmation Details Snippet */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-300 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-mono text-[11px] text-slate-300 line-clamp-1">{app.confirmationDetails}</span>
                </div>
                <span className="text-[11px] text-slate-500 shrink-0 ml-2">
                  Applied {new Date(app.appliedAt).toLocaleDateString()}
                </span>
              </div>

            </div>
          ))
        )}
      </div>

      {/* Package Detail Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl relative my-8">
            <button
              onClick={() => setSelectedApp(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wide">{selectedApp.company}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                  {selectedApp.status.toUpperCase()}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mt-0.5">{selectedApp.jobTitle}</h3>
              <p className="text-xs text-slate-400 mt-1">Submitted on {new Date(selectedApp.appliedAt).toLocaleString()}</p>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-800 space-x-2">
              <button
                onClick={() => setActiveTabModal('resume')}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
                  activeTabModal === 'resume'
                    ? 'border-indigo-500 text-indigo-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Tailored Resume (Markdown)
              </button>
              <button
                onClick={() => setActiveTabModal('cover')}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
                  activeTabModal === 'cover'
                    ? 'border-indigo-500 text-indigo-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Custom Cover Letter
              </button>
              <button
                onClick={() => setActiveTabModal('form')}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
                  activeTabModal === 'form'
                    ? 'border-indigo-500 text-indigo-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                ATS Form Mapped Answers ({selectedApp.formFieldsFilled.length})
              </button>
            </div>

            {/* Modal Content */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-200 max-h-96 overflow-y-auto leading-relaxed">
              {activeTabModal === 'resume' && (
                <div className="whitespace-pre-wrap font-mono text-[11px] text-slate-300">
                  {selectedApp.tailoredCV}
                </div>
              )}

              {activeTabModal === 'cover' && (
                <div className="whitespace-pre-wrap font-sans text-xs text-slate-300 leading-relaxed">
                  {selectedApp.tailoredCoverLetter}
                </div>
              )}

              {activeTabModal === 'form' && (
                <div className="space-y-3">
                  {selectedApp.formFieldsFilled.map((field, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">{field.fieldLabel}</span>
                        <span className="text-[10px] font-mono text-indigo-400">{field.fieldType}</span>
                      </div>
                      <p className="font-mono text-xs text-emerald-300 bg-slate-950 p-2 rounded border border-slate-850">
                        {field.valueToFill}
                      </p>
                      <p className="text-[10px] text-slate-500 italic">{field.explanation}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                onClick={() => generateResumePDF(userProfile.fullName, selectedApp.company, selectedApp.tailoredCV)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-indigo-300 bg-indigo-950 hover:bg-indigo-900 border border-indigo-700/50 flex items-center space-x-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Export PDF Resume</span>
              </button>

              <button
                onClick={() => setSelectedApp(null)}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700"
              >
                Close Package Inspector
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
