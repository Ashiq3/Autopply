import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Check, RotateCcw, Play, X, RefreshCw } from 'lucide-react';
import {
  ScheduleConfig,
  SavedSearchAlert,
  LlmProviderConfig,
  LlmProviderId,
  ProviderAvailabilityMap,
} from '../types';
import { LLM_PROVIDER_CATALOG } from '../data/defaults';

interface SettingsScheduleProps {
  scheduleConfig: ScheduleConfig;
  onSaveSchedule: (updatedConfig: ScheduleConfig) => void;
  onRunSavedAlert?: (alert: SavedSearchAlert) => void;
  onResetDemoData?: () => void;
  llmConfig: LlmProviderConfig;
  onChangeLlmConfig: (updated: LlmProviderConfig) => void;
  providerAvailability: ProviderAvailabilityMap | null;
  onRefreshProviders?: () => Promise<void> | void;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const SettingsSchedule: React.FC<SettingsScheduleProps> = ({
  scheduleConfig,
  onSaveSchedule,
  onRunSavedAlert,
  onResetDemoData,
  llmConfig,
  onChangeLlmConfig,
  providerAvailability,
  onRefreshProviders,
}) => {
  const [config, setConfig] = useState<ScheduleConfig>(scheduleConfig);
  const [isSaved, setIsSaved] = useState(false);
  const [newExcluded, setNewExcluded] = useState('');
  const [isRefreshingProviders, setIsRefreshingProviders] = useState(false);

  const [isCreatingAlert, setIsCreatingAlert] = useState(false);
  const [alertName, setAlertName] = useState('');
  const [alertTitles, setAlertTitles] = useState<string[]>(['Junior React Developer']);
  const [newTitleInput, setNewTitleInput] = useState('');
  const [alertKeywords, setAlertKeywords] = useState<string[]>(['React', 'TypeScript']);
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const [alertLocationType, setAlertLocationType] = useState<'remote_only' | 'hybrid' | 'onsite' | 'all'>('remote_only');
  const [alertExpLevel, setAlertExpLevel] = useState<'fresher' | 'entry' | 'mid' | 'senior' | 'all'>('entry');
  const [alertDatePosted, setAlertDatePosted] = useState<'anytime' | '24h' | '3d' | '7d' | '14d'>('7d');
  const [alertMinSalary, setAlertMinSalary] = useState<string>('60k');

  useEffect(() => {
    setConfig(scheduleConfig);
  }, [scheduleConfig]);

  const handleChange = (field: keyof ScheduleConfig, value: any) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setIsSaved(false);
  };

  const handleToggleDay = (day: string) => {
    const exists = config.daysOfWeek.includes(day);
    const updated = exists ? config.daysOfWeek.filter((d) => d !== day) : [...config.daysOfWeek, day];
    handleChange('daysOfWeek', updated);
  };

  const handleAddExcluded = () => {
    if (newExcluded.trim() && !config.excludedCompanies.includes(newExcluded.trim())) {
      setConfig((prev) => ({ ...prev, excludedCompanies: [...prev.excludedCompanies, newExcluded.trim()] }));
      setNewExcluded('');
      setIsSaved(false);
    }
  };

  const handleRemoveExcluded = (comp: string) => {
    setConfig((prev) => ({ ...prev, excludedCompanies: config.excludedCompanies.filter((c) => c !== comp) }));
    setIsSaved(false);
  };

  const handleToggleAlert = (alertId: string) => {
    const updatedAlerts = (config.savedSearchAlerts || []).map((a) =>
      a.id === alertId ? { ...a, isEnabled: !a.isEnabled } : a
    );
    setConfig((prev) => ({ ...prev, savedSearchAlerts: updatedAlerts }));
    setIsSaved(false);
  };

  const handleDeleteAlert = (alertId: string) => {
    const updatedAlerts = (config.savedSearchAlerts || []).filter((a) => a.id !== alertId);
    setConfig((prev) => ({ ...prev, savedSearchAlerts: updatedAlerts }));
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
      lastRunAt: 'Not run yet',
      matchesFoundCount: 0,
    };

    const updatedAlerts = [newAlert, ...(config.savedSearchAlerts || [])];
    setConfig((prev) => ({ ...prev, savedSearchAlerts: updatedAlerts }));

    setAlertName('');
    setIsCreatingAlert(false);
    setIsSaved(false);
  };

  const handleSave = () => {
    onSaveSchedule(config);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const activeProviderMeta =
    LLM_PROVIDER_CATALOG.find((p) => p.id === llmConfig.provider) || LLM_PROVIDER_CATALOG[0];

  const handleSelectProvider = (providerId: LlmProviderId) => {
    const meta = LLM_PROVIDER_CATALOG.find((p) => p.id === providerId) || LLM_PROVIDER_CATALOG[0];
    onChangeLlmConfig({
      provider: providerId,
      model: meta.defaultModel,
    });
  };

  const handleRefreshProvidersClick = async () => {
    if (!onRefreshProviders) return;
    setIsRefreshingProviders(true);
    try {
      await onRefreshProviders();
    } finally {
      setIsRefreshingProviders(false);
    }
  };

  const isSelectedProviderConfigured = providerAvailability ? providerAvailability[llmConfig.provider] : null;
  const hasPresetModel = activeProviderMeta.models.some((m) => m.id === llmConfig.model);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-50 tracking-tight">
            Settings, AI Providers &amp; Alerts
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Select your LLM provider &amp; model, configure run thresholds, and manage search alert presets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onResetDemoData && (
            <button
              type="button"
              onClick={onResetDemoData}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100 shadow-2xs transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset All Data</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-colors ${
              isSaved
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{isSaved ? 'Saved' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {/* AI Model Provider Selection */}
      <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6 text-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">AI Model Provider</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Choose which backend LLM powers job search, CV parsing, ATS audits, and resume tailoring.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefreshProvidersClick}
            disabled={isRefreshingProviders}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100 shadow-2xs self-start sm:self-auto whitespace-nowrap transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshingProviders ? 'animate-spin' : ''}`} />
            <span>Check Server Keys</span>
          </button>
        </div>

        {/* Provider Selector Radio Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {LLM_PROVIDER_CATALOG.map((providerMeta) => {
            const isSelected = llmConfig.provider === providerMeta.id;
            const isConfigured = providerAvailability ? providerAvailability[providerMeta.id] : null;
            return (
              <button
                key={providerMeta.id}
                type="button"
                onClick={() => handleSelectProvider(providerMeta.id)}
                className={`text-left p-4 rounded-xl border-2 transition-all space-y-2 ${
                  isSelected
                    ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-600 dark:border-blue-500 text-zinc-950 dark:text-zinc-50 shadow-xs'
                    : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:border-zinc-400 dark:hover:border-zinc-600'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm truncate">{providerMeta.name}</span>
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-zinc-300 dark:border-zinc-700 bg-transparent'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-mono text-zinc-500 dark:text-zinc-400 truncate">
                    {providerMeta.envKeyName}
                  </span>
                  {isConfigured !== null && (
                    <span
                      className={`font-semibold shrink-0 ${
                        isConfigured
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      {isConfigured ? 'Ready' : 'Key missing'}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Provider Model Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-2 items-end">
          <div className="md:col-span-5 space-y-1.5">
            <label className="text-zinc-700 dark:text-zinc-300 font-medium block">Preset Model</label>
            <select
              value={hasPresetModel ? llmConfig.model : '__custom__'}
              onChange={(e) => {
                if (e.target.value !== '__custom__') {
                  onChangeLlmConfig({ ...llmConfig, model: e.target.value });
                }
              }}
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
            >
              {activeProviderMeta.models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                  {m.note ? ` · ${m.note}` : ''}
                </option>
              ))}
              {!hasPresetModel && <option value="__custom__">Custom ({llmConfig.model})</option>}
            </select>
          </div>

          <div className="md:col-span-7 space-y-1.5">
            <label className="text-zinc-700 dark:text-zinc-300 font-medium block">
              Model ID (editable for custom or free-tier slugs)
            </label>
            <input
              type="text"
              value={llmConfig.model}
              onChange={(e) => onChangeLlmConfig({ ...llmConfig, model: e.target.value })}
              placeholder={activeProviderMeta.defaultModel}
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800 text-sm text-zinc-600 dark:text-zinc-400">
          <span>{activeProviderMeta.description}</span>
          {isSelectedProviderConfigured === false ? (
            <span className="text-amber-700 dark:text-amber-400 font-medium">
              Set <code className="font-mono">{activeProviderMeta.envKeyName}</code> in Settings &gt; Secrets (or{' '}
              <code className="font-mono">.env</code>) to activate {activeProviderMeta.name}.
            </span>
          ) : isSelectedProviderConfigured === true ? (
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold whitespace-nowrap">
              {activeProviderMeta.envKeyName} configured on server
            </span>
          ) : null}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 text-sm">
        <section className="md:col-span-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-5">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-50 border-b border-zinc-200 dark:border-zinc-800 pb-3">
            Run Preferences
          </h2>

          <div className="space-y-5">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="font-semibold text-zinc-950 dark:text-zinc-100 block">Enable Scheduled Window</span>
                <span className="text-zinc-500 dark:text-zinc-400">Track preferred daily execution schedule</span>
              </div>
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => handleChange('enabled', e.target.checked)}
                className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600"
              />
            </label>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <label className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl cursor-pointer">
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">Remote only</span>
                <input
                  type="checkbox"
                  checked={config.isRemoteOnly}
                  onChange={(e) => handleChange('isRemoteOnly', e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl cursor-pointer">
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">Non-voice only</span>
                <input
                  type="checkbox"
                  checked={Boolean(config.nonVoiceOnly)}
                  onChange={(e) => handleChange('nonVoiceOnly', e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600"
                />
              </label>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-zinc-700 dark:text-zinc-300 font-medium block">Frequency</label>
                <select
                  value={config.frequency}
                  onChange={(e) => handleChange('frequency', e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekdays">Weekdays</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-zinc-700 dark:text-zinc-300 font-medium block">Trigger Time</label>
                <input
                  type="time"
                  value={config.runTime}
                  onChange={(e) => handleChange('runTime', e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 tabular-nums focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-zinc-700 dark:text-zinc-300 font-medium block">Max Apps / Run</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={config.maxAppsPerRun}
                  onChange={(e) => handleChange('maxAppsPerRun', Number(e.target.value))}
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 tabular-nums focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {config.frequency === 'custom' && (
              <div className="space-y-2">
                <label className="text-zinc-700 dark:text-zinc-300 font-medium block">Active Days</label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((day) => {
                    const active = config.daysOfWeek.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleToggleDay(day)}
                        className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition-colors ${
                          active
                            ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 border-zinc-900 dark:border-zinc-100'
                            : 'bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <label className="text-zinc-700 dark:text-zinc-300 font-semibold">Minimum Match Threshold</label>
                <span className="font-mono font-bold text-zinc-950 dark:text-zinc-50 tabular-nums">
                  {config.minMatchScore}%
                </span>
              </div>
              <input
                type="range"
                min={50}
                max={95}
                step={5}
                value={config.minMatchScore}
                onChange={(e) => handleChange('minMatchScore', Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <p className="text-zinc-500 dark:text-zinc-400">
                Pipeline skips openings below {config.minMatchScore}% match during automatic selection.
              </p>
            </div>
          </div>
        </section>

        <section className="md:col-span-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-5">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-50 border-b border-zinc-200 dark:border-zinc-800 pb-3">
            Company Blocklist &amp; Notifications
          </h2>

          <div className="space-y-5">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="font-semibold text-zinc-950 dark:text-zinc-100 block">Run Digest Flag</span>
                <span className="text-zinc-500 dark:text-zinc-400">Mark batch runs for summary review</span>
              </div>
              <input
                type="checkbox"
                checked={config.notifyViaEmail}
                onChange={(e) => handleChange('notifyViaEmail', e.target.checked)}
                className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <div>
                <span className="font-semibold text-zinc-950 dark:text-zinc-100 block">Follow-Up Reminders</span>
                <span className="text-zinc-500 dark:text-zinc-400">
                  Enable 7-day follow-up tracking in Applications
                </span>
              </div>
              <input
                type="checkbox"
                checked={config.syncGoogleTasks}
                onChange={(e) => handleChange('syncGoogleTasks', e.target.checked)}
                className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600"
              />
            </label>

            <div className="space-y-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <label className="text-zinc-700 dark:text-zinc-300 font-semibold block">Excluded Companies</label>
              <div className="flex flex-wrap gap-2 p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl min-h-[44px]">
                {config.excludedCompanies.map((comp) => (
                  <span
                    key={comp}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-medium"
                  >
                    <span>{comp}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveExcluded(comp)}
                      aria-label={`Remove ${comp}`}
                      className="text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2.5">
                <input
                  type="text"
                  placeholder="Exclude company or agency..."
                  value={newExcluded}
                  onChange={(e) => setNewExcluded(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddExcluded())}
                  className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddExcluded}
                  className="px-4 py-2.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-950 rounded-xl font-semibold whitespace-nowrap shadow-xs"
                >
                  Exclude
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Saved Search Alerts */}
      <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">Saved Search Alerts</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Reusable query presets you can execute immediately in Job Search.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreatingAlert(!isCreatingAlert)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm self-start sm:self-auto whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>{isCreatingAlert ? 'Cancel' : 'New Search Alert'}</span>
          </button>
        </div>

        {isCreatingAlert && (
          <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-zinc-700 dark:text-zinc-300 font-medium block">Alert Name</label>
                <input
                  type="text"
                  placeholder="e.g. Remote React Junior Roles"
                  value={alertName}
                  onChange={(e) => setAlertName(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-zinc-700 dark:text-zinc-300 font-medium block">Minimum Salary</label>
                <select
                  value={alertMinSalary}
                  onChange={(e) => setAlertMinSalary(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="any">Any Salary</option>
                  <option value="40k">$40k+</option>
                  <option value="60k">$60k+</option>
                  <option value="80k">$80k+</option>
                  <option value="100k">$100k+</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-zinc-700 dark:text-zinc-300 font-medium block">Target Titles</label>
                <div className="flex flex-wrap items-center gap-2 p-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl min-h-[44px]">
                  {alertTitles.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    >
                      <span>{t}</span>
                      <button
                        type="button"
                        onClick={() => setAlertTitles(alertTitles.filter((x) => x !== t))}
                        aria-label={`Remove ${t}`}
                        className="text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
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
                    className="bg-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none text-sm px-1.5 flex-1 min-w-[120px]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-zinc-700 dark:text-zinc-300 font-medium block">Keywords</label>
                <div className="flex flex-wrap items-center gap-2 p-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl min-h-[44px]">
                  {alertKeywords.map((k) => (
                    <span
                      key={k}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    >
                      <span>{k}</span>
                      <button
                        type="button"
                        onClick={() => setAlertKeywords(alertKeywords.filter((x) => x !== k))}
                        aria-label={`Remove ${k}`}
                        className="text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
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
                    className="bg-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none text-sm px-1.5 flex-1 min-w-[120px]"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-zinc-600 dark:text-zinc-400 font-medium block">Location</label>
                <select
                  value={alertLocationType}
                  onChange={(e) => setAlertLocationType(e.target.value as any)}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
                >
                  <option value="remote_only">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="onsite">On-site</option>
                  <option value="all">All</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-zinc-600 dark:text-zinc-400 font-medium block">Experience</label>
                <select
                  value={alertExpLevel}
                  onChange={(e) => setAlertExpLevel(e.target.value as any)}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
                >
                  <option value="fresher">Fresher</option>
                  <option value="entry">Entry</option>
                  <option value="mid">Mid</option>
                  <option value="all">All</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-zinc-600 dark:text-zinc-400 font-medium block">Posted</label>
                <select
                  value={alertDatePosted}
                  onChange={(e) => setAlertDatePosted(e.target.value as any)}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
                >
                  <option value="24h">24 hours</option>
                  <option value="3d">3 days</option>
                  <option value="7d">7 days</option>
                  <option value="anytime">Any time</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleCreateAlert}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-950 shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>Save Alert</span>
              </button>
            </div>
          </div>
        )}

        <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          {!config.savedSearchAlerts || config.savedSearchAlerts.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 text-sm">
              No saved search alerts yet. Click New Search Alert to create a preset.
            </div>
          ) : (
            config.savedSearchAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-sm ${
                  alert.isEnabled
                    ? 'bg-white dark:bg-zinc-900'
                    : 'bg-zinc-50 dark:bg-zinc-950 opacity-70'
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="font-bold text-zinc-950 dark:text-zinc-50 text-base">{alert.name}</div>
                  <div className="text-zinc-500 dark:text-zinc-400">
                    {alert.locationType === 'remote_only' ? 'Remote' : alert.locationType} · Posted:{' '}
                    {alert.datePosted} · Titles: {alert.targetTitles.join(', ')} · Keywords:{' '}
                    {alert.queryKeywords.join(', ')}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                  {onRunSavedAlert && (
                    <button
                      type="button"
                      onClick={() => onRunSavedAlert(alert)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-950 font-semibold shadow-xs"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Run Now</span>
                    </button>
                  )}

                  <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
                    <input
                      type="checkbox"
                      checked={alert.isEnabled}
                      onChange={() => handleToggleAlert(alert.id)}
                      className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600"
                    />
                    <span className="font-medium text-zinc-700 dark:text-zinc-200">
                      {alert.isEnabled ? 'Active' : 'Paused'}
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => handleDeleteAlert(alert.id)}
                    aria-label={`Delete ${alert.name}`}
                    className="p-2 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:border-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};
