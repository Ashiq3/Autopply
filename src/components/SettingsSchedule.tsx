import React, { useState } from 'react';
import { 
  Sliders, 
  Clock, 
  CheckCircle2, 
  Save, 
  AlertCircle, 
  Mail, 
  ListTodo, 
  Globe, 
  ShieldAlert,
  Sparkles,
  Bell,
  Plus,
  Trash2,
  Search,
  MapPin,
  Calendar,
  Award,
  DollarSign,
  Tag,
  Check
} from 'lucide-react';
import { ScheduleConfig, SavedSearchAlert } from '../types';

interface SettingsScheduleProps {
  scheduleConfig: ScheduleConfig;
  onSaveSchedule: (updatedConfig: ScheduleConfig) => void;
}

export const SettingsSchedule: React.FC<SettingsScheduleProps> = ({
  scheduleConfig,
  onSaveSchedule
}) => {
  const [config, setConfig] = useState<ScheduleConfig>(scheduleConfig);
  const [isSaved, setIsSaved] = useState(false);
  const [newExcluded, setNewExcluded] = useState('');

  // New Search Alert Form States
  const [isCreatingAlert, setIsCreatingAlert] = useState(false);
  const [alertName, setAlertName] = useState('');
  const [alertTitles, setAlertTitles] = useState<string[]>(['Junior React Developer']);
  const [newTitleInput, setNewTitleInput] = useState('');
  const [alertKeywords, setAlertKeywords] = useState<string[]>(['React', 'TypeScript']);
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const [alertLocationType, setAlertLocationType] = useState<'remote_only' | 'hybrid' | 'onsite' | 'all'>('remote_only');
  const [alertExpLevel, setAlertExpLevel] = useState<'fresher' | 'entry' | 'mid' | 'senior' | 'all'>('fresher');
  const [alertDatePosted, setAlertDatePosted] = useState<'anytime' | '24h' | '3d' | '7d' | '14d'>('24h');
  const [alertMinSalary, setAlertMinSalary] = useState<string>('60k');

  const handleChange = (field: keyof ScheduleConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setIsSaved(false);
  };

  const handleAddExcluded = () => {
    if (newExcluded.trim() && !config.excludedCompanies.includes(newExcluded.trim())) {
      setConfig(prev => ({ ...prev, excludedCompanies: [...prev.excludedCompanies, newExcluded.trim()] }));
      setNewExcluded('');
      setIsSaved(false);
    }
  };

  const handleRemoveExcluded = (comp: string) => {
    setConfig(prev => ({ ...prev, excludedCompanies: config.excludedCompanies.filter(c => c !== comp) }));
    setIsSaved(false);
  };

  // Search Alert Handlers
  const handleToggleAlert = (alertId: string) => {
    const updatedAlerts = (config.savedSearchAlerts || []).map(a => 
      a.id === alertId ? { ...a, isEnabled: !a.isEnabled } : a
    );
    setConfig(prev => ({ ...prev, savedSearchAlerts: updatedAlerts }));
    setIsSaved(false);
  };

  const handleDeleteAlert = (alertId: string) => {
    const updatedAlerts = (config.savedSearchAlerts || []).filter(a => a.id !== alertId);
    setConfig(prev => ({ ...prev, savedSearchAlerts: updatedAlerts }));
    setIsSaved(false);
  };

  const handleCreateAlert = () => {
    if (!alertName.trim()) return;

    const newAlert: SavedSearchAlert = {
      id: `alert_${Date.now()}`,
      name: alertName.trim(),
      targetTitles: alertTitles.length > 0 ? alertTitles : ['Software Engineer'],
      queryKeywords: alertKeywords.length > 0 ? alertKeywords : ['React', 'TypeScript'],
      locationType: alertLocationType,
      experienceLevel: alertExpLevel,
      datePosted: alertDatePosted,
      minSalary: alertMinSalary,
      isEnabled: true,
      lastRunAt: 'Pending next schedule',
      matchesFoundCount: 0
    };

    const updatedAlerts = [newAlert, ...(config.savedSearchAlerts || [])];
    setConfig(prev => ({ ...prev, savedSearchAlerts: updatedAlerts }));
    
    // Reset Form
    setAlertName('');
    setIsCreatingAlert(false);
    setIsSaved(false);
  };

  const handleSave = () => {
    onSaveSchedule(config);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            Schedule Runner & Saved Search Alerts
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure automated schedule windows and define saved search alerts that run during background agent runs.
          </p>
        </div>

        <button
          onClick={handleSave}
          className={`px-5 py-2 rounded-xl text-xs font-semibold text-white transition-all flex items-center space-x-1.5 shadow-md ${
            isSaved ? 'bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-500'
          }`}
        >
          {isSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          <span>{isSaved ? 'Settings Saved!' : 'Save Configuration'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 text-xs">
        
        {/* Schedule & Run Frequency */}
        <div className="md:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="font-bold text-sm text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Clock className="w-4 h-4 text-amber-400" /> Automated Schedule Runner
          </h3>

          <div className="space-y-3">
            
            <label className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer">
              <div>
                <span className="font-semibold text-slate-200 block">Enable Automated Daily Search</span>
                <span className="text-[10px] text-slate-400">Agent will automatically execute on schedule</span>
              </div>
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => handleChange('enabled', e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Daily Trigger Time</label>
                <input
                  type="time"
                  value={config.runTime}
                  onChange={(e) => handleChange('runTime', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Max Applications / Run</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={config.maxAppsPerRun}
                  onChange={(e) => handleChange('maxAppsPerRun', Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-medium">Min Candidate Match Threshold (%)</label>
              <div className="flex items-center space-x-3">
                <input
                  type="range"
                  min={50}
                  max={95}
                  step={5}
                  value={config.minMatchScore}
                  onChange={(e) => handleChange('minMatchScore', Number(e.target.value))}
                  className="flex-1 accent-indigo-500"
                />
                <span className="font-bold text-indigo-400 font-mono w-12 text-right">{config.minMatchScore}%</span>
              </div>
              <p className="text-[10px] text-slate-500">Agent will skip listings matching below {config.minMatchScore}%</p>
            </div>

          </div>
        </div>

        {/* Notifications & Integrations */}
        <div className="md:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="font-bold text-sm text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Mail className="w-4 h-4 text-cyan-400" /> Notifications & Google Workspace Sync
          </h3>

          <div className="space-y-3">
            
            <label className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer">
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-indigo-400" />
                <div>
                  <span className="font-semibold text-slate-200 block">Gmail Status Summaries</span>
                  <span className="text-[10px] text-slate-400">Receive email notification after each agent batch run</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.notifyViaEmail}
                onChange={(e) => handleChange('notifyViaEmail', e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer">
              <div className="flex items-center space-x-2">
                <ListTodo className="w-4 h-4 text-cyan-400" />
                <div>
                  <span className="font-semibold text-slate-200 block">Google Tasks Sync</span>
                  <span className="text-[10px] text-slate-400">Automatically create follow-up reminder tasks for applied jobs</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.syncGoogleTasks}
                onChange={(e) => handleChange('syncGoogleTasks', e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700"
              />
            </label>

            {/* Excluded Companies */}
            <div className="space-y-2 pt-1">
              <label className="text-slate-400 font-medium block">Excluded Companies & Agencies</label>
              <div className="flex flex-wrap gap-1.5 p-2 bg-slate-950 border border-slate-800 rounded-xl min-h-[38px]">
                {config.excludedCompanies.map((comp) => (
                  <span key={comp} className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    <span>{comp}</span>
                    <button onClick={() => handleRemoveExcluded(comp)} className="hover:text-rose-400">
                      &times;
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Exclude company..."
                  value={newExcluded}
                  onChange={(e) => setNewExcluded(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddExcluded())}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleAddExcluded}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium"
                >
                  Add Exclude
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Saved Search Alerts Management Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              Scheduled Search Alerts & Query Monitors
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Saved search queries execute automatically during scheduled agent windows to discover targeted new job postings.
            </p>
          </div>

          <button
            onClick={() => setIsCreatingAlert(!isCreatingAlert)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center space-x-1.5 self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isCreatingAlert ? 'Cancel Alert' : 'Create New Search Alert'}</span>
          </button>
        </div>

        {/* Create New Search Alert Form */}
        {isCreatingAlert && (
          <div className="bg-slate-950 border border-indigo-500/40 rounded-xl p-4 space-y-4 text-xs animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-indigo-300">New Automated Search Alert</span>
              <span className="text-[10px] text-slate-400">Will run during scheduled agent run time ({config.runTime})</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Alert Name</label>
                <input
                  type="text"
                  placeholder="e.g. Remote React Fresher Jobs"
                  value={alertName}
                  onChange={(e) => setAlertName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Minimum Salary Estimate</label>
                <select
                  value={alertMinSalary}
                  onChange={(e) => setAlertMinSalary(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="any">Any Salary</option>
                  <option value="40k">$40k+ / year</option>
                  <option value="60k">$60k+ / year</option>
                  <option value="80k">$80k+ / year</option>
                  <option value="100k">$100k+ / year</option>
                </select>
              </div>
            </div>

            {/* Target Titles Input */}
            <div className="space-y-1">
              <label className="text-slate-300 font-medium block">Target Job Titles</label>
              <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-900 border border-slate-800 rounded-xl min-h-[38px]">
                {alertTitles.map(t => (
                  <span key={t} className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/50">
                    <span>{t}</span>
                    <button onClick={() => setAlertTitles(alertTitles.filter(x => x !== t))} className="hover:text-rose-400">&times;</button>
                  </span>
                ))}
                <input
                  type="text"
                  placeholder="Add title..."
                  value={newTitleInput}
                  onChange={(e) => setNewTitleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newTitleInput.trim()) {
                      e.preventDefault();
                      setAlertTitles([...alertTitles, newTitleInput.trim()]);
                      setNewTitleInput('');
                    }
                  }}
                  className="bg-transparent text-slate-200 focus:outline-none text-xs px-2 py-0.5 flex-1 min-w-[120px]"
                />
              </div>
            </div>

            {/* Required Keywords Input */}
            <div className="space-y-1">
              <label className="text-slate-300 font-medium block">Required Tech Stack Keywords</label>
              <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-900 border border-slate-800 rounded-xl min-h-[38px]">
                {alertKeywords.map(k => (
                  <span key={k} className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    <span>{k}</span>
                    <button onClick={() => setAlertKeywords(alertKeywords.filter(x => x !== k))} className="hover:text-rose-400">&times;</button>
                  </span>
                ))}
                <input
                  type="text"
                  placeholder="Add keyword..."
                  value={newKeywordInput}
                  onChange={(e) => setNewKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newKeywordInput.trim()) {
                      e.preventDefault();
                      setAlertKeywords([...alertKeywords, newKeywordInput.trim()]);
                      setNewKeywordInput('');
                    }
                  }}
                  className="bg-transparent text-slate-200 focus:outline-none text-xs px-2 py-0.5 flex-1 min-w-[120px]"
                />
              </div>
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-slate-400">Location Type</label>
                <select
                  value={alertLocationType}
                  onChange={(e) => setAlertLocationType(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-200 focus:outline-none"
                >
                  <option value="remote_only">100% Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="onsite">On-site</option>
                  <option value="all">All Locations</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Experience Level</label>
                <select
                  value={alertExpLevel}
                  onChange={(e) => setAlertExpLevel(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-200 focus:outline-none"
                >
                  <option value="fresher">Fresher (0 Yrs)</option>
                  <option value="entry">Entry Level (0-2 Yrs)</option>
                  <option value="mid">Mid Level</option>
                  <option value="all">All Levels</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Date Posted Window</label>
                <select
                  value={alertDatePosted}
                  onChange={(e) => setAlertDatePosted(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-200 focus:outline-none"
                >
                  <option value="24h">Last 24 Hours</option>
                  <option value="3d">Last 3 Days</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="anytime">Any Time</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleCreateAlert}
                className="px-4 py-2 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Search Alert</span>
              </button>
            </div>
          </div>
        )}

        {/* Saved Alerts List */}
        <div className="space-y-3">
          {(!config.savedSearchAlerts || config.savedSearchAlerts.length === 0) ? (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-slate-400 text-xs">
              No active search alerts saved yet. Click "Create New Search Alert" above to save targeted queries for scheduled runs.
            </div>
          ) : (
            config.savedSearchAlerts.map(alert => (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs ${
                  alert.isEnabled
                    ? 'bg-slate-950 border-slate-800'
                    : 'bg-slate-950/40 border-slate-900 opacity-60'
                }`}
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2 h-2 rounded-full ${alert.isEnabled ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-slate-600'}`} />
                    <h4 className="font-bold text-white text-sm">{alert.name}</h4>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">
                      {alert.locationType === 'remote_only' ? '100% Remote' : alert.locationType}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800">
                      Posted: {alert.datePosted}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                    <span className="text-slate-300 font-medium">Titles:</span>
                    {alert.targetTitles.map((t, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-300">
                        {t}
                      </span>
                    ))}
                    <span className="mx-1">•</span>
                    <span className="text-slate-300 font-medium">Keywords:</span>
                    {alert.queryKeywords.map((k, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-cyan-300">
                        {k}
                      </span>
                    ))}
                  </div>

                  {alert.lastRunAt && (
                    <div className="text-[10px] text-slate-500">
                      Last Execution: {alert.lastRunAt} ({alert.matchesFoundCount || 0} matches found)
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-3 shrink-0 self-end md:self-center">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <span className="text-[11px] font-semibold text-slate-400">{alert.isEnabled ? 'Active' : 'Paused'}</span>
                    <input
                      type="checkbox"
                      checked={alert.isEnabled}
                      onChange={() => handleToggleAlert(alert.id)}
                      className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700"
                    />
                  </label>

                  <button
                    onClick={() => handleDeleteAlert(alert.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
};
