import React, { useState, useEffect, useMemo } from 'react';
import {
  Save,
  Plus,
  Trash2,
  Check,
  RotateCcw,
  Play,
  X,
  RefreshCw,
  KeyRound,
  Eye,
  EyeOff,
  ExternalLink,
  Unlink,
  Search,
} from 'lucide-react';
import {
  ScheduleConfig,
  SavedSearchAlert,
  LlmProviderConfig,
  LlmProviderId,
  LlmModelOption,
  ProviderAvailabilityMap,
} from '../types';
import { LLM_PROVIDER_CATALOG } from '../data/defaults';
import {
  getProviderCredential,
  saveProviderCredential,
  removeProviderCredential,
  hasClientProviderKey,
  buildLlmHeaders,
  maskApiKey,
  connectOpenRouterWithOAuth,
} from '../utils/llmClient';

interface SettingsScheduleProps {
  scheduleConfig: ScheduleConfig;
  onSaveSchedule: (updatedConfig: ScheduleConfig) => void;
  onRunSavedAlert?: (alert: SavedSearchAlert) => void;
  onResetDemoData?: () => void;
  llmConfig: LlmProviderConfig;
  onChangeLlmConfig: (updated: LlmProviderConfig) => void;
  providerAvailability: ProviderAvailabilityMap | null;
  onRefreshProviders?: () => Promise<void> | void;
  onCredentialChange?: () => void;
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
  onCredentialChange,
}) => {
  const [config, setConfig] = useState<ScheduleConfig>(scheduleConfig);
  const [isSaved, setIsSaved] = useState(false);
  const [newExcluded, setNewExcluded] = useState('');
  const [isRefreshingProviders, setIsRefreshingProviders] = useState(false);

  // Provider credential & live model picker state
  const activeProviderMeta =
    LLM_PROVIDER_CATALOG.find((p) => p.id === llmConfig.provider) || LLM_PROVIDER_CATALOG[0];

  const [apiKeyInput, setApiKeyInput] = useState<string>(() => getProviderCredential(llmConfig.provider)?.apiKey || '');
  const [baseUrlInput, setBaseUrlInput] = useState<string>(
    () => llmConfig.baseUrl || getProviderCredential(llmConfig.provider)?.baseUrl || activeProviderMeta.defaultBaseUrl || ''
  );
  const [showApiKey, setShowApiKey] = useState(false);
  const [showManualOpenRouterKey, setShowManualOpenRouterKey] = useState(false);
  const [rememberInBrowser, setRememberInBrowser] = useState(true);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isConnectingOAuth, setIsConnectingOAuth] = useState(false);
  const [blockedAuthUrl, setBlockedAuthUrl] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [liveModels, setLiveModels] = useState<LlmModelOption[]>([]);
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [freeModelsOnly, setFreeModelsOnly] = useState(llmConfig.provider === 'openrouter');
  const [modelsError, setModelsError] = useState<string | null>(null);

  // Saved search alert creator state
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

  // Sync key & baseUrl inputs whenever active provider switches
  useEffect(() => {
    const stored = getProviderCredential(llmConfig.provider);
    const meta = LLM_PROVIDER_CATALOG.find((p) => p.id === llmConfig.provider) || LLM_PROVIDER_CATALOG[0];
    setApiKeyInput(stored?.apiKey || '');
    setBaseUrlInput(
      llmConfig.provider === 'custom'
        ? llmConfig.baseUrl || stored?.baseUrl || ''
        : meta.defaultBaseUrl || ''
    );
    setShowApiKey(false);
    setShowManualOpenRouterKey(false);
    setBlockedAuthUrl(null);
    setConnectionStatus(null);
    setLiveModels([]);
    setModelsError(null);
    setModelSearchQuery('');
    setFreeModelsOnly(llmConfig.provider === 'openrouter');
  }, [llmConfig.provider]);

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

  const handleSelectProvider = (providerId: LlmProviderId) => {
    const meta = LLM_PROVIDER_CATALOG.find((p) => p.id === providerId) || LLM_PROVIDER_CATALOG[0];
    const stored = getProviderCredential(providerId);
    onChangeLlmConfig({
      provider: providerId,
      model: meta.defaultModel,
      baseUrl: providerId === 'custom' ? stored?.baseUrl || '' : undefined,
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

  const handleLoadLiveModels = async (overrideKey?: string, overrideUrl?: string) => {
    if (!activeProviderMeta.supportsDynamicModels) return;
    setIsLoadingModels(true);
    setModelsError(null);
    try {
      const effectiveUrl = llmConfig.provider === 'custom' ? (overrideUrl ?? baseUrlInput).trim() : undefined;
      const effectiveKey = (overrideKey ?? apiKeyInput).trim();
      const res = await fetch('/api/providers/models', {
        method: 'POST',
        headers: buildLlmHeaders(llmConfig, effectiveKey || undefined, effectiveUrl),
        body: JSON.stringify({
          llmConfig: {
            provider: llmConfig.provider,
            model: llmConfig.model,
            baseUrl: effectiveUrl,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Could not load live models from provider.');
      }
      setLiveModels(Array.isArray(data.models) ? data.models : []);
    } catch (err: any) {
      setModelsError(err.message || 'Unable to fetch model catalog.');
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleTestAndConnect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedKey = apiKeyInput.trim();
    const trimmedBaseUrl = llmConfig.provider === 'custom' ? baseUrlInput.trim() : undefined;

    if (activeProviderMeta.requiresApiKey && !trimmedKey && !providerAvailability?.[llmConfig.provider]) {
      setConnectionStatus({
        type: 'error',
        message: `Paste your ${activeProviderMeta.name} API key first.`,
      });
      return;
    }

    if (llmConfig.provider === 'custom' && !trimmedBaseUrl) {
      setConnectionStatus({
        type: 'error',
        message: 'Enter an HTTPS Base URL (for example: https://api.x.ai/v1).',
      });
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus(null);

    try {
      const res = await fetch('/api/providers/test', {
        method: 'POST',
        headers: buildLlmHeaders(llmConfig, trimmedKey || undefined, trimmedBaseUrl),
        body: JSON.stringify({
          llmConfig: {
            provider: llmConfig.provider,
            model: llmConfig.model,
            baseUrl: trimmedBaseUrl,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Connection failed (${res.status}).`);
      }

      if (trimmedKey || trimmedBaseUrl) {
        saveProviderCredential(
          llmConfig.provider,
          {
            apiKey: trimmedKey,
            baseUrl: trimmedBaseUrl,
            maskedHint: trimmedKey ? maskApiKey(trimmedKey) : undefined,
            verifiedAt: new Date().toISOString(),
          },
          rememberInBrowser
        );
      }

      if (llmConfig.provider === 'custom' && trimmedBaseUrl) {
        onChangeLlmConfig({ ...llmConfig, baseUrl: trimmedBaseUrl });
      }

      onCredentialChange?.();
      setConnectionStatus({
        type: 'success',
        message: data.message || `${activeProviderMeta.name} connected and ready to use.`,
      });

      if (activeProviderMeta.supportsDynamicModels) {
        handleLoadLiveModels(trimmedKey, trimmedBaseUrl);
      }
    } catch (err: any) {
      setConnectionStatus({
        type: 'error',
        message: err.message || 'Verification failed. Check your API key and model ID.',
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleOpenRouterOAuthConnect = async () => {
    setIsConnectingOAuth(true);
    setBlockedAuthUrl(null);
    setConnectionStatus({
      type: 'info',
      message: 'Complete sign-in in the OpenRouter window to connect your account...',
    });

    try {
      const { maskedHint } = await connectOpenRouterWithOAuth({
        persistInBrowser: rememberInBrowser,
        onPopupBlocked: (url) => {
          setBlockedAuthUrl(url);
        },
      });
      const stored = getProviderCredential('openrouter');
      if (stored?.apiKey) setApiKeyInput(stored.apiKey);
      onCredentialChange?.();
      setBlockedAuthUrl(null);
      setConnectionStatus({
        type: 'success',
        message: `OpenRouter connected automatically (${maskedHint}). Free and paid models are ready to use.`,
      });
      handleLoadLiveModels(stored?.apiKey);
    } catch (err: any) {
      setConnectionStatus({
        type: 'error',
        message: err?.message || 'Could not complete OpenRouter sign-in.',
      });
    } finally {
      setIsConnectingOAuth(false);
    }
  };

  const handleDisconnectProvider = () => {
    removeProviderCredential(llmConfig.provider);
    setApiKeyInput('');
    setBlockedAuthUrl(null);
    if (llmConfig.provider === 'custom') {
      setBaseUrlInput('');
      onChangeLlmConfig({ ...llmConfig, baseUrl: undefined });
    }
    setConnectionStatus({
      type: 'info',
      message: `Disconnected ${activeProviderMeta.name} from this browser.`,
    });
    onCredentialChange?.();
  };

  const storedCred = getProviderCredential(llmConfig.provider);
  const hasBrowserKey = hasClientProviderKey(llmConfig.provider);
  const hasServerKey = Boolean(providerAvailability?.[llmConfig.provider]);
  const isActiveConnected = hasBrowserKey || hasServerKey;
  const hasPresetModel = activeProviderMeta.models.some((m) => m.id === llmConfig.model);

  const filteredLiveModels = useMemo(() => {
    const q = modelSearchQuery.trim().toLowerCase();
    return liveModels
      .filter((m) => {
        if (freeModelsOnly && !m.isFree) return false;
        if (!q) return true;
        return m.id.toLowerCase().includes(q) || m.label.toLowerCase().includes(q);
      })
      .slice(0, 60);
  }, [liveModels, modelSearchQuery, freeModelsOnly]);

  const hasFreeModelsInList = useMemo(() => liveModels.some((m) => m.isFree), [liveModels]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-50 tracking-tight">
            Settings, AI Providers &amp; Alerts
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Connect OpenRouter or any third-party AI provider with your API key, choose a model, and manage run alerts.
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

      {/* AI Model Provider Connection & Selection */}
      <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6 text-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">AI Model Provider</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Select a provider and paste your API key below to power job search, CV parsing, ATS audits, and resume
              tailoring.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefreshProvidersClick}
            disabled={isRefreshingProviders}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100 shadow-2xs self-start sm:self-auto whitespace-nowrap transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshingProviders ? 'animate-spin' : ''}`} />
            <span>Refresh Status</span>
          </button>
        </div>

        {/* 8 Provider Selector Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {LLM_PROVIDER_CATALOG.map((providerMeta) => {
            const isSelected = llmConfig.provider === providerMeta.id;
            const browserConnected = hasClientProviderKey(providerMeta.id);
            const serverConnected = Boolean(providerAvailability?.[providerMeta.id]);
            const ready = browserConnected || serverConnected;

            const statusLabel = browserConnected
              ? 'Ready (Browser)'
              : serverConnected
                ? 'Ready (Server)'
                : 'Not connected';

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
                    {providerMeta.defaultModel}
                  </span>
                  <span
                    className={`font-semibold shrink-0 ${
                      ready ? 'text-emerald-700 dark:text-emerald-400' : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    {statusLabel}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Connect Provider Panel */}
        <form
          onSubmit={handleTestAndConnect}
          className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950 p-5 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 font-bold text-zinc-950 dark:text-zinc-50">
                <KeyRound className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Connect {activeProviderMeta.name}</span>
                {isActiveConnected && (
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    ·{' '}
                    {hasBrowserKey
                      ? storedCred?.authMethod === 'oauth'
                        ? `Connected via OAuth (${storedCred?.maskedHint || 'active'})`
                        : `Connected (${storedCred?.maskedHint || 'key active'})`
                      : 'Server key active'}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">{activeProviderMeta.description}</p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {llmConfig.provider !== 'openrouter' && activeProviderMeta.keyPortalUrl && (
                <a
                  href={activeProviderMeta.keyPortalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-blue-700 dark:text-blue-400 hover:border-blue-500 whitespace-nowrap"
                >
                  <span>{activeProviderMeta.keyPortalLabel}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              {hasBrowserKey && (
                <button
                  type="button"
                  onClick={handleDisconnectProvider}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 whitespace-nowrap"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              )}
            </div>
          </div>

          {/* Primary 1-Click OAuth Connect for OpenRouter */}
          {llmConfig.provider === 'openrouter' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <div className="space-y-1">
                <div className="font-semibold text-zinc-950 dark:text-zinc-100">
                  {hasBrowserKey ? 'OpenRouter account connected' : 'One-click OpenRouter sign-in'}
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  {hasBrowserKey
                    ? 'You can reconnect anytime or switch between free and paid models below.'
                    : 'Sign in with your OpenRouter account in one click—no copying or pasting API keys required.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleOpenRouterOAuthConnect}
                  disabled={isConnectingOAuth}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors whitespace-nowrap disabled:opacity-60"
                >
                  {isConnectingOAuth ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Authorizing...</span>
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4" />
                      <span>{hasBrowserKey ? 'Reconnect OpenRouter' : 'Connect with OpenRouter'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {blockedAuthUrl && (
            <div className="px-4 py-3 rounded-xl border border-amber-200 dark:border-amber-900/70 bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-3">
              <span>Popup was blocked by your browser. Open OpenRouter authorization directly:</span>
              <a
                href={blockedAuthUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              >
                <span>Open OpenRouter Sign-In</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {llmConfig.provider === 'openrouter' && (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowManualOpenRouterKey((prev) => !prev)}
                className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 underline underline-offset-4"
              >
                {showManualOpenRouterKey ? 'Hide manual API key input' : 'Or enter an OpenRouter API key manually'}
              </button>
            </div>
          )}

          {(llmConfig.provider !== 'openrouter' || showManualOpenRouterKey) && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              {llmConfig.provider === 'custom' && (
                <div className="md:col-span-5 space-y-1.5">
                  <label className="text-zinc-700 dark:text-zinc-300 font-medium block">HTTPS Base URL</label>
                  <input
                    type="url"
                    value={baseUrlInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBaseUrlInput(val);
                      onChangeLlmConfig({ ...llmConfig, baseUrl: val });
                    }}
                    placeholder="https://api.x.ai/v1"
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div className={`${llmConfig.provider === 'custom' ? 'md:col-span-7' : 'md:col-span-12'} space-y-1.5`}>
                <label className="text-zinc-700 dark:text-zinc-300 font-medium block">
                  {activeProviderMeta.name} API Key{' '}
                  {!activeProviderMeta.requiresApiKey && (
                    <span className="font-normal text-zinc-500 dark:text-zinc-400">
                      (optional if endpoint has no auth)
                    </span>
                  )}
                </label>
                <div className="flex gap-2.5">
                  <div className="relative flex-1">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      autoComplete="off"
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder={
                        hasServerKey && !apiKeyInput
                          ? 'Server key active — paste your own key to override'
                          : activeProviderMeta.apiKeyPlaceholder
                      }
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl pl-3.5 pr-10 py-2.5 text-sm font-mono text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey((prev) => !prev)}
                      aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isTestingConnection}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors whitespace-nowrap disabled:opacity-60"
                  >
                    {isTestingConnection ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Testing...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Test &amp; Connect</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <label className="inline-flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberInBrowser}
                onChange={(e) => setRememberInBrowser(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600"
              />
              <span>Remember connection in this browser (uncheck for current session only)</span>
            </label>

            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
              Env fallback: {activeProviderMeta.envKeyName}
            </span>
          </div>

          {connectionStatus && (
            <div
              className={`px-4 py-3 rounded-xl border text-sm font-medium ${
                connectionStatus.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/70 text-emerald-800 dark:text-emerald-200'
                  : connectionStatus.type === 'error'
                    ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/70 text-red-800 dark:text-red-200'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              {connectionStatus.message}
            </div>
          )}
        </form>

        {/* Selected Provider Model Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-1 items-end">
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

          <div className={`${activeProviderMeta.supportsDynamicModels ? 'md:col-span-5' : 'md:col-span-7'} space-y-1.5`}>
            <label className="text-zinc-700 dark:text-zinc-300 font-medium block">
              Model ID (editable for any provider slug)
            </label>
            <input
              type="text"
              value={llmConfig.model}
              onChange={(e) => onChangeLlmConfig({ ...llmConfig, model: e.target.value })}
              placeholder={activeProviderMeta.defaultModel}
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {activeProviderMeta.supportsDynamicModels && (
            <div className="md:col-span-2">
              <button
                type="button"
                onClick={() => handleLoadLiveModels()}
                disabled={isLoadingModels}
                className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:border-blue-500 text-zinc-800 dark:text-zinc-100 shadow-2xs transition-colors whitespace-nowrap disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingModels ? 'animate-spin' : ''}`} />
                <span>{isLoadingModels ? 'Loading...' : 'Browse Models'}</span>
              </button>
            </div>
          )}
        </div>

        {modelsError && (
          <div className="px-4 py-3 rounded-xl border border-red-200 dark:border-red-900/70 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 text-xs">
            {modelsError}
          </div>
        )}

        {/* Live Searchable Model Browser */}
        {liveModels.length > 0 && (
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-50/70 dark:bg-zinc-950">
            <div className="p-3.5 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={modelSearchQuery}
                  onChange={(e) => setModelSearchQuery(e.target.value)}
                  placeholder={`Filter ${liveModels.length} available ${activeProviderMeta.name} models...`}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg pl-9 pr-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              {(hasFreeModelsInList || llmConfig.provider === 'openrouter') && (
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={freeModelsOnly}
                    onChange={(e) => setFreeModelsOnly(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600"
                  />
                  <span>Free models only</span>
                </label>
              )}
            </div>

            <div className="max-h-56 overflow-y-auto divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredLiveModels.length === 0 ? (
                <div className="p-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
                  No models match "{modelSearchQuery}".
                </div>
              ) : (
                filteredLiveModels.map((m) => {
                  const isCurrent = llmConfig.model === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onChangeLlmConfig({ ...llmConfig, model: m.id })}
                      className={`w-full px-4 py-2.5 text-left flex items-center justify-between gap-3 text-xs transition-colors ${
                        isCurrent
                          ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200'
                          : 'bg-white dark:bg-zinc-900/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/70 text-zinc-800 dark:text-zinc-200'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{m.label}</div>
                        <div className="font-mono text-zinc-500 dark:text-zinc-400 truncate">{m.id}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {m.isFree && (
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400">Free</span>
                        )}
                        {!m.isFree && m.note && (
                          <span className="text-zinc-500 dark:text-zinc-400">{m.note}</span>
                        )}
                        {isCurrent && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
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
