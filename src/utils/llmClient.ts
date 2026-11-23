import { LlmProviderConfig, LlmProviderId, ProviderCredentialEntry } from '../types';

const CREDENTIALS_STORAGE_KEY = 'autoapply_provider_credentials_v1';

// In-memory credential store (always kept even if user disables browser persistence)
let memoryCredentials: Partial<Record<LlmProviderId, ProviderCredentialEntry>> = {};

function readStoredCredentials(): Partial<Record<LlmProviderId, ProviderCredentialEntry>> {
  try {
    const raw = localStorage.getItem(CREDENTIALS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return { ...parsed, ...memoryCredentials };
      }
    }
  } catch {
    // Ignore storage access errors
  }
  return { ...memoryCredentials };
}

export function maskApiKey(rawKey: string): string {
  const key = rawKey.trim();
  if (!key) return '';
  if (key.length <= 10) return '••••••••';
  return `${key.slice(0, 6)}••••${key.slice(-4)}`;
}

export function getProviderCredentialsMap(): Partial<Record<LlmProviderId, ProviderCredentialEntry>> {
  return readStoredCredentials();
}

export function getProviderCredential(provider: LlmProviderId): ProviderCredentialEntry | null {
  const all = readStoredCredentials();
  return all[provider] || null;
}

export function saveProviderCredential(
  provider: LlmProviderId,
  entry: ProviderCredentialEntry,
  persistInBrowser = true
): void {
  const normalized: ProviderCredentialEntry = {
    apiKey: entry.apiKey.trim(),
    baseUrl: entry.baseUrl?.trim() || undefined,
    maskedHint: entry.maskedHint || (entry.apiKey.trim() ? maskApiKey(entry.apiKey.trim()) : undefined),
    verifiedAt: entry.verifiedAt || new Date().toISOString(),
    authMethod: entry.authMethod || 'manual',
  };

  memoryCredentials = {
    ...memoryCredentials,
    [provider]: normalized,
  };

  if (persistInBrowser) {
    try {
      const existing = readStoredCredentials();
      const updated = { ...existing, [provider]: normalized };
      localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage quota errors
    }
  }
}

export function removeProviderCredential(provider: LlmProviderId): void {
  const nextMem = { ...memoryCredentials };
  delete nextMem[provider];
  memoryCredentials = nextMem;

  try {
    const raw = localStorage.getItem(CREDENTIALS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        delete parsed[provider];
        localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(parsed));
      }
    }
  } catch {
    // Ignore storage errors
  }
}

export function hasClientProviderKey(provider: LlmProviderId): boolean {
  const cred = getProviderCredential(provider);
  if (!cred) return false;
  if (provider === 'custom') {
    return Boolean(cred.baseUrl && cred.baseUrl.trim().length > 0);
  }
  return Boolean(cred.apiKey && cred.apiKey.trim().length > 0);
}

export function buildLlmHeaders(
  llmConfig?: LlmProviderConfig,
  overrideApiKey?: string,
  overrideBaseUrl?: string
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const provider = llmConfig?.provider;
  const stored = provider ? getProviderCredential(provider) : null;
  const apiKey = (overrideApiKey ?? stored?.apiKey ?? '').trim();
  const baseUrl = (overrideBaseUrl ?? llmConfig?.baseUrl ?? stored?.baseUrl ?? '').trim();

  if (apiKey) {
    headers['X-LLM-API-Key'] = apiKey;
  }
  if (baseUrl) {
    headers['X-LLM-Base-Url'] = baseUrl;
  }
  return headers;
}

export function normalizeLlmPayload(llmConfig?: LlmProviderConfig): LlmProviderConfig | undefined {
  if (!llmConfig) return undefined;
  const stored = getProviderCredential(llmConfig.provider);
  return {
    provider: llmConfig.provider,
    model: llmConfig.model,
    baseUrl: llmConfig.baseUrl || stored?.baseUrl || undefined,
  };
}

export async function agentFetch(
  url: string,
  body: Record<string, any>,
  llmConfig?: LlmProviderConfig
): Promise<Response> {
  const effectiveConfig = normalizeLlmPayload(llmConfig);
  return fetch(url, {
    method: 'POST',
    headers: buildLlmHeaders(effectiveConfig),
    body: JSON.stringify({
      ...body,
      ...(effectiveConfig ? { llmConfig: effectiveConfig } : {}),
    }),
  });
}

export async function connectOpenRouterWithOAuth(options?: {
  persistInBrowser?: boolean;
  onPopupBlocked?: (authUrl: string) => void;
}): Promise<{ maskedHint: string }> {
  const persistInBrowser = options?.persistInBrowser ?? true;

  const startRes = await fetch('/api/auth/openrouter/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ origin: window.location.origin }),
  });

  const startData = await startRes.json();
  if (!startRes.ok || !startData?.success || !startData?.authUrl || !startData?.state) {
    throw new Error(startData?.error || 'Could not start OpenRouter sign-in.');
  }

  const { authUrl, state } = startData as { authUrl: string; state: string };

  const popup = window.open(
    authUrl,
    'openrouter_oauth',
    'width=560,height=720,scrollbars=yes,resizable=yes'
  );

  if (!popup) {
    options?.onPopupBlocked?.(authUrl);
  }

  return new Promise<{ maskedHint: string }>((resolve, reject) => {
    let settled = false;
    let claiming = false;
    let closedTicks = 0;
    let pollTimer: number | undefined;
    let timeoutTimer: number | undefined;

    const cleanup = () => {
      window.removeEventListener('message', handleMessage);
      if (pollTimer !== undefined) window.clearInterval(pollTimer);
      if (timeoutTimer !== undefined) window.clearTimeout(timeoutTimer);
    };

    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(message));
    };

    const claim = async (claimToken: string) => {
      if (settled || claiming) return;
      claiming = true;
      try {
        const claimRes = await fetch('/api/auth/openrouter/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ claimToken, state }),
        });
        const claimData = await claimRes.json();
        if (!claimRes.ok || !claimData?.success || !claimData?.apiKey) {
          throw new Error(claimData?.error || 'Failed to finalize OpenRouter connection.');
        }

        const maskedHint = claimData.maskedHint || maskApiKey(claimData.apiKey);
        saveProviderCredential(
          'openrouter',
          {
            apiKey: claimData.apiKey,
            maskedHint,
            verifiedAt: new Date().toISOString(),
            authMethod: 'oauth',
          },
          persistInBrowser
        );

        settled = true;
        cleanup();
        resolve({ maskedHint });
      } catch (err: any) {
        claiming = false;
        fail(err?.message || 'Failed to complete OpenRouter sign-in.');
      }
    };

    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin || '';
      const isTrustedOrigin =
        origin === window.location.origin ||
        origin.endsWith('.run.app') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1');
      if (!isTrustedOrigin) return;

      const msg = event.data;
      if (!msg || typeof msg !== 'object' || msg.state !== state) return;

      if (msg.type === 'OPENROUTER_OAUTH_SUCCESS' && typeof msg.claimToken === 'string') {
        claim(msg.claimToken);
      } else if (msg.type === 'OPENROUTER_OAUTH_ERROR') {
        fail(msg.message || 'OpenRouter authorization was cancelled.');
      }
    };

    window.addEventListener('message', handleMessage);

    pollTimer = window.setInterval(async () => {
      if (settled || claiming) return;
      try {
        const res = await fetch(`/api/auth/openrouter/poll/${encodeURIComponent(state)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'completed' && data.claimToken) {
            claim(data.claimToken);
            return;
          }
          if (data.status === 'error') {
            fail(data.error || 'OpenRouter authorization failed.');
            return;
          }
          if (data.status === 'expired') {
            fail('OpenRouter sign-in session expired. Please try again.');
            return;
          }
        }
      } catch {
        // Ignore transient network errors while polling
      }

      if (popup && popup.closed) {
        closedTicks += 1;
        if (closedTicks >= 2) {
          fail('OpenRouter sign-in window was closed before authorization completed.');
        }
      }
    }, 1500);

    timeoutTimer = window.setTimeout(() => {
      fail('OpenRouter sign-in timed out. Please try again.');
    }, 180_000);
  });
}
