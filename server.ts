import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import net from 'node:net';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import mammoth from 'mammoth';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const FALLBACK_MODEL = 'gemini-4-hydrogen';
const DECISION_MODEL = 'gemini-decision-1';

type LlmProviderId =
  | 'openrouter'
  | 'openai'
  | 'anthropic'
  | 'groq'
  | 'deepseek'
  | 'together'
  | 'mistral'
  | 'custom'
  | 'gemini';

interface LlmConfig {
  provider: LlmProviderId;
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

interface LlmFileAttachment {
  fileName: string;
  mimeType: string;
  base64: string;
}

interface LlmGenerationOptions {
  llmConfig: LlmConfig;
  prompt: string;
  systemInstruction?: string;
  responseKind?: 'object' | 'array' | 'text';
  geminiSchema?: any;
  useWebSearch?: boolean;
  allowGeminiFallback?: boolean;
  fileAttachment?: LlmFileAttachment;
}

interface LlmGenerationResult {
  text: string;
  groundingUrls: string[];
  usedModel: string;
}

class LlmHttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const PUBLIC_THIRD_PARTY_PROVIDERS: Exclude<LlmProviderId, 'gemini'>[] = [
  'openrouter',
  'openai',
  'anthropic',
  'groq',
  'deepseek',
  'together',
  'mistral',
  'custom',
];

const VALID_PROVIDERS: LlmProviderId[] = [...PUBLIC_THIRD_PARTY_PROVIDERS, 'gemini'];

const PROVIDER_ENV_META: Record<
  LlmProviderId,
  { envKey: string; label: string; defaultModel: string; baseUrl?: string }
> = {
  openrouter: {
    envKey: 'OPENROUTER_API_KEY',
    label: 'OpenRouter',
    defaultModel: process.env.OPENROUTER_MODEL || 'openrouter/free',
    baseUrl: 'https://openrouter.ai/api/v1',
  },
  openai: {
    envKey: 'OPENAI_API_KEY',
    label: 'OpenAI',
    defaultModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    baseUrl: 'https://api.openai.com/v1',
  },
  anthropic: {
    envKey: 'ANTHROPIC_API_KEY',
    label: 'Claude (Anthropic)',
    defaultModel: process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest',
    baseUrl: 'https://api.anthropic.com/v1',
  },
  groq: {
    envKey: 'GROQ_API_KEY',
    label: 'Groq',
    defaultModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    baseUrl: 'https://api.groq.com/openai/v1',
  },
  deepseek: {
    envKey: 'DEEPSEEK_API_KEY',
    label: 'DeepSeek',
    defaultModel: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    baseUrl: 'https://api.deepseek.com/v1',
  },
  together: {
    envKey: 'TOGETHER_API_KEY',
    label: 'Together AI',
    defaultModel: process.env.TOGETHER_MODEL || 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    baseUrl: 'https://api.together.xyz/v1',
  },
  mistral: {
    envKey: 'MISTRAL_API_KEY',
    label: 'Mistral AI',
    defaultModel: process.env.MISTRAL_MODEL || 'mistral-small-latest',
    baseUrl: 'https://api.mistral.ai/v1',
  },
  custom: {
    envKey: 'CUSTOM_LLM_API_KEY',
    label: 'Custom (OpenAI-Compatible)',
    defaultModel: process.env.CUSTOM_LLM_MODEL || 'gpt-4o-mini',
    baseUrl: process.env.CUSTOM_LLM_BASE_URL || '',
  },
  gemini: {
    envKey: 'GEMINI_API_KEY',
    label: 'Google Gemini',
    defaultModel: DEFAULT_MODEL,
  },
};

function cleanEnvKey(raw: string | undefined, placeholders: string[] = []): string | null {
  const apiKey = (raw || '').trim().replace(/^["']|["']$/g, '').trim();
  if (
    !apiKey ||
    apiKey.toLowerCase() === 'undefined' ||
    apiKey.toLowerCase() === 'null' ||
    placeholders.includes(apiKey)
  ) {
    return null;
  }
  return apiKey;
}

const PROVIDER_PLACEHOLDERS: Record<LlmProviderId, string[]> = {
  gemini: ['YOUR_GEMINI_API_KEY', 'MY_GEMINI_API_KEY'],
  openrouter: ['YOUR_OPENROUTER_API_KEY'],
  openai: ['YOUR_OPENAI_API_KEY'],
  anthropic: ['YOUR_ANTHROPIC_API_KEY'],
  groq: ['YOUR_GROQ_API_KEY'],
  deepseek: ['YOUR_DEEPSEEK_API_KEY'],
  together: ['YOUR_TOGETHER_API_KEY'],
  mistral: ['YOUR_MISTRAL_API_KEY'],
  custom: ['YOUR_CUSTOM_LLM_API_KEY'],
};

function readDynamicEnvFile(fileName: string): Record<string, string> {
  try {
    const filePath = path.join(process.cwd(), fileName);
    if (!fs.existsSync(filePath)) return {};
    return dotenv.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

function readServerKeyVault(): Partial<Record<LlmProviderId | string, string>> {
  try {
    const vaultPath = path.join(process.cwd(), '.provider-keys.json');
    if (!fs.existsSync(vaultPath)) return {};
    const parsed = JSON.parse(fs.readFileSync(vaultPath, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function getProviderApiKey(provider: LlmProviderId): string | null {
  const meta = PROVIDER_ENV_META[provider];
  const placeholders = PROVIDER_PLACEHOLDERS[provider] || [];

  const vault = readServerKeyVault();
  const envLocal = readDynamicEnvFile('.env.local');
  const envFile = readDynamicEnvFile('.env');

  const candidates = [
    process.env[meta.envKey],
    envLocal[meta.envKey],
    envFile[meta.envKey],
    vault[provider],
    vault[meta.envKey],
  ];

  for (const candidate of candidates) {
    const cleaned = cleanEnvKey(typeof candidate === 'string' ? candidate : undefined, placeholders);
    if (cleaned) return cleaned;
  }

  return null;
}

function isGeminiPublicAllowed(): boolean {
  const envLocal = readDynamicEnvFile('.env.local');
  const envFile = readDynamicEnvFile('.env');
  const raw = process.env.ALLOW_GEMINI_PUBLIC ?? envLocal.ALLOW_GEMINI_PUBLIC ?? envFile.ALLOW_GEMINI_PUBLIC;
  return String(raw || 'true').toLowerCase() !== 'false';
}

function requireProviderApiKey(provider: LlmProviderId, overrideApiKey?: string): string {
  const cleanedOverride = cleanEnvKey(overrideApiKey, PROVIDER_PLACEHOLDERS[provider] || []);
  if (cleanedOverride) {
    return cleanedOverride;
  }

  if (provider === 'gemini' && !isGeminiPublicAllowed()) {
    throw new LlmHttpError(
      403,
      'Public Gemini access is disabled on this server. Connect OpenRouter or another AI provider in Settings.'
    );
  }
  const key = getProviderApiKey(provider);
  if (!key) {
    if (provider === 'custom') {
      return '';
    }
    const meta = PROVIDER_ENV_META[provider];
    throw new LlmHttpError(
      401,
      `No API key configured for ${meta.label}. Open Settings → AI Model Provider and connect your ${meta.label} API key.`
    );
  }
  return key;
}

function isPrivateOrBlockedIp(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (net.isIPv4(normalized)) {
    const parts = normalized.split('.').map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // multicast/reserved
    return false;
  }
  if (net.isIPv6(normalized)) {
    if (normalized === '::1' || normalized === '::') return true;
    if (normalized.startsWith('fe80:') || normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
    if (normalized.startsWith('::ffff:')) {
      return isPrivateOrBlockedIp(normalized.slice(7));
    }
    return false;
  }
  return true;
}

async function validateCustomBaseUrl(rawUrl: string): Promise<string> {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) {
    throw new LlmHttpError(400, 'Please enter a valid HTTPS Base URL for your Custom OpenAI-compatible provider.');
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new LlmHttpError(400, 'Invalid Base URL format. Example: https://api.x.ai/v1');
  }

  if (parsed.protocol !== 'https:') {
    throw new LlmHttpError(400, 'Custom provider Base URL must use HTTPS (e.g. https://api.x.ai/v1).');
  }
  if (parsed.username || parsed.password) {
    throw new LlmHttpError(400, 'Base URL must not contain embedded username or password credentials.');
  }

  const host = parsed.hostname.toLowerCase();
  if (
    !host ||
    host === 'localhost' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === 'metadata.google.internal'
  ) {
    throw new LlmHttpError(400, 'Blocked internal or local hostname in Custom Base URL.');
  }

  if (net.isIP(host)) {
    if (isPrivateOrBlockedIp(host)) {
      throw new LlmHttpError(400, 'Private or reserved IP addresses are not permitted for Custom Base URL.');
    }
  } else {
    try {
      const addresses = await dns.lookup(host, { all: true });
      if (!addresses || addresses.length === 0) {
        throw new LlmHttpError(400, `Could not resolve hostname "${host}".`);
      }
      for (const addr of addresses) {
        if (isPrivateOrBlockedIp(addr.address)) {
          throw new LlmHttpError(400, 'Resolved IP address is private or restricted.');
        }
      }
    } catch (err: any) {
      if (err instanceof LlmHttpError) throw err;
      throw new LlmHttpError(400, `Could not resolve Custom Base URL hostname "${host}".`);
    }
  }

  return parsed.toString().replace(/\/+$/, '');
}

function resolveLlmConfig(reqOrRaw?: any): LlmConfig {
  const isExpressReq = reqOrRaw && typeof reqOrRaw === 'object' && ('headers' in reqOrRaw || 'body' in reqOrRaw);
  const rawConfig = isExpressReq ? reqOrRaw.body?.llmConfig : reqOrRaw;
  const headerApiKey = isExpressReq ? String(reqOrRaw.headers?.['x-llm-api-key'] || '').trim() : '';
  const headerBaseUrl = isExpressReq ? String(reqOrRaw.headers?.['x-llm-base-url'] || '').trim() : '';

  const envDefaultProvider = String(process.env.AI_PROVIDER || '').toLowerCase() as LlmProviderId;
  const requestedProvider = String(rawConfig?.provider || '').toLowerCase() as LlmProviderId;

  const provider: LlmProviderId = VALID_PROVIDERS.includes(requestedProvider)
    ? requestedProvider
    : VALID_PROVIDERS.includes(envDefaultProvider)
      ? envDefaultProvider
      : 'openrouter';

  const requestedModel = typeof rawConfig?.model === 'string' ? rawConfig.model.trim() : '';
  const model = requestedModel || PROVIDER_ENV_META[provider].defaultModel;
  const baseUrl =
    headerBaseUrl ||
    (typeof rawConfig?.baseUrl === 'string' ? rawConfig.baseUrl.trim() : '') ||
    PROVIDER_ENV_META[provider].baseUrl ||
    '';

  return {
    provider,
    model,
    apiKey: headerApiKey || undefined,
    baseUrl: baseUrl || undefined,
  };
}

function stripReasoningBlocks(rawText: string): string {
  return String(rawText || '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function extractJsonObject<T = any>(rawText: string): T | null {
  if (!rawText) return null;
  const cleaned = stripReasoningBlocks(rawText);

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function extractJsonArray<T = any>(rawText: string): T[] | null {
  if (!rawText) return null;
  const cleaned = stripReasoningBlocks(rawText);

  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    const match = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        return Array.isArray(parsed) ? parsed : null;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function formatGeminiError(error: any, modelName = DEFAULT_MODEL): { status: number; message: string } {
  const rawMessage = String(error?.message || error || 'Unexpected server error');

  if (rawMessage.includes('GEMINI_API_KEY is not configured')) {
    return { status: 503, message: rawMessage };
  }

  let parsedCode: number | undefined;
  let parsedStatus = '';
  let parsedDetail = '';

  try {
    const maybeJson = JSON.parse(rawMessage);
    parsedCode = maybeJson?.error?.code;
    parsedStatus = maybeJson?.error?.status || '';
    parsedDetail = maybeJson?.error?.message || '';
  } catch {
    // rawMessage is plain text
  }

  const combined = `${rawMessage} ${parsedStatus} ${parsedDetail}`.toUpperCase();

  if (combined.includes('API_KEY_INVALID') || combined.includes('API KEY NOT VALID')) {
    return {
      status: 401,
      message:
        'Your Gemini API key is invalid. Please select or update a valid key in Settings > Secrets (or in your local .env file).',
    };
  }

  if (parsedCode === 403 || combined.includes('PERMISSION_DENIED')) {
    return {
      status: 403,
      message:
        'Gemini API permission denied. Please verify your API key permissions in Settings > Secrets.',
    };
  }

  if (parsedCode === 429 || combined.includes('RESOURCE_EXHAUSTED')) {
    const retryMatch = rawMessage.match(/Please retry in ([^."\\\n]+)/i);
    const retryNote = retryMatch ? ` Retry in ${retryMatch[1].trim()}.` : '';
    return {
      status: 429,
      message: `Gemini API daily/rate quota reached for this key.${retryNote} Wait for quota reset, switch to a billing-enabled API key in Settings > Secrets, or choose OpenRouter / OpenAI / Claude in Schedule.`,
    };
  }

  if (parsedCode === 503 || combined.includes('UNAVAILABLE') || combined.includes('HIGH DEMAND')) {
    return {
      status: 503,
      message:
        'Gemini model is temporarily experiencing high demand. Please retry in a few seconds.',
    };
  }

  if (parsedCode === 404 || combined.includes('NOT_FOUND')) {
    return {
      status: 404,
      message: `Requested Gemini model ("${modelName}") was not found or is unsupported for your key.`,
    };
  }

  return {
    status: 500,
    message: parsedDetail || rawMessage,
  };
}

function formatLlmError(
  provider: LlmProviderId,
  model: string,
  error: any
): { status: number; message: string } {
  if (error instanceof LlmHttpError) {
    return { status: error.status, message: error.message };
  }
  if (provider === 'gemini') {
    return formatGeminiError(error, model);
  }
  const msg = String(error?.message || error || 'Unexpected LLM provider error');
  return { status: 502, message: msg };
}

function isQuotaExhaustedError(error: any): boolean {
  if (error instanceof LlmHttpError && error.status === 429) return true;
  const msg = String(error?.message || error || '').toUpperCase();
  return msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
}

function isTransientUnavailableError(error: any): boolean {
  if (error instanceof LlmHttpError) {
    return error.status === 503 || error.status === 502 || error.status === 504;
  }
  const msg = String(error?.message || error || '').toUpperCase();
  return (
    msg.includes('503') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('HIGH DEMAND') ||
    msg.includes('ECONNRESET') ||
    msg.includes('ETIMEDOUT')
  );
}

async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries && isTransientUnavailableError(err)) {
        const delayMs = 900 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

async function generateWithModelFallback(
  ai: GoogleGenAI,
  primaryModel: string,
  buildParams: (model: string) => Parameters<GoogleGenAI['models']['generateContent']>[0]
) {
  try {
    const response = await callWithRetry(() => ai.models.generateContent(buildParams(primaryModel)));
    return { response, usedModel: primaryModel };
  } catch (err: any) {
    if (isQuotaExhaustedError(err) && primaryModel !== FALLBACK_MODEL) {
      const response = await callWithRetry(() => ai.models.generateContent(buildParams(FALLBACK_MODEL)));
      return { response, usedModel: FALLBACK_MODEL };
    }
    throw err;
  }
}

function formatUpstreamProviderHttpError(
  provider: LlmProviderId,
  model: string,
  status: number,
  rawBody: string
): LlmHttpError {
  const meta = PROVIDER_ENV_META[provider];
  let detail = rawBody;
  try {
    const parsed = JSON.parse(rawBody);
    detail =
      parsed?.error?.message ||
      parsed?.message ||
      parsed?.error ||
      rawBody;
  } catch {
    // plain text body
  }

  if (status === 401) {
    return new LlmHttpError(
      401,
      `Your ${meta.label} API key (${meta.envKey}) is invalid or expired. Check Settings > Secrets or your .env file.`
    );
  }
  if (status === 402) {
    return new LlmHttpError(
      402,
      `${meta.label} account has insufficient credits or balance. Add credits or choose a free model / another provider.`
    );
  }
  if (status === 403) {
    return new LlmHttpError(
      403,
      `${meta.label} API access forbidden for ${meta.envKey}. ${detail ? `(${detail})` : ''}`.trim()
    );
  }
  if (status === 404) {
    return new LlmHttpError(
      404,
      `Model "${model}" was not found or is unavailable on ${meta.label}. Check the model ID in Schedule.`
    );
  }
  if (status === 429) {
    return new LlmHttpError(
      429,
      `${meta.label} rate limit or quota exceeded for "${model}". Retry shortly or switch model/provider.`
    );
  }
  if (status === 503 || status === 502 || status === 504) {
    return new LlmHttpError(
      503,
      `${meta.label} service is temporarily unavailable (${status}). Please retry in a few seconds.`
    );
  }

  return new LlmHttpError(status >= 400 && status < 600 ? status : 502, `${meta.label} error: ${detail || `HTTP ${status}`}`);
}

async function callOpenRouter(opts: LlmGenerationOptions): Promise<LlmGenerationResult> {
  const apiKey = requireProviderApiKey('openrouter', opts.llmConfig.apiKey);
  const { llmConfig, prompt, systemInstruction, responseKind = 'text', useWebSearch, fileAttachment } = opts;

  const sysText =
    systemInstruction ||
    (responseKind !== 'text'
      ? 'You are a precise JSON generator. Return strictly valid JSON with no markdown prose or commentary outside the JSON.'
      : undefined);

  const userContent: any = fileAttachment
    ? [
        { type: 'text', text: prompt },
        {
          type: 'file',
          file: {
            filename: fileAttachment.fileName,
            file_data: `data:${fileAttachment.mimeType};base64,${fileAttachment.base64}`,
          },
        },
      ]
    : prompt;

  const messages: any[] = [];
  if (sysText) messages.push({ role: 'system', content: sysText });
  messages.push({ role: 'user', content: userContent });

  const isFreeModel = llmConfig.model === 'openrouter/free' || llmConfig.model.endsWith(':free');

  const executeOpenRouter = async (enableWebPlugin: boolean): Promise<any> => {
    const plugins: any[] = [];
    if (enableWebPlugin && useWebSearch && !isFreeModel) {
      plugins.push({ id: 'web', max_results: 6 });
    }
    if (fileAttachment && fileAttachment.mimeType.toLowerCase().includes('pdf')) {
      plugins.push({ id: 'file-parser', pdf: { engine: 'pdf-text' } });
    }

    const body: any = {
      model: llmConfig.model,
      messages,
    };
    if (plugins.length > 0) {
      body.plugins = plugins;
    }

    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
        'X-Title': 'AutoApply AI',
      },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const errText = await r.text();
      if (enableWebPlugin && useWebSearch && (r.status === 400 || r.status === 402 || r.status === 404)) {
        return executeOpenRouter(false);
      }
      throw formatUpstreamProviderHttpError('openrouter', llmConfig.model, r.status, errText);
    }
    return r.json();
  };

  const resp = await callWithRetry(() => executeOpenRouter(Boolean(useWebSearch && !isFreeModel)));

  const message = resp?.choices?.[0]?.message;
  let text = '';
  if (typeof message?.content === 'string') {
    text = message.content;
  } else if (Array.isArray(message?.content)) {
    text = message.content
      .map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
      .join('\n');
  }

  const groundingUrls: string[] = [];
  if (Array.isArray(message?.annotations)) {
    for (const ann of message.annotations) {
      const url = ann?.url_citation?.url;
      if (typeof url === 'string' && url.length > 0) groundingUrls.push(url);
    }
  }

  return {
    text,
    groundingUrls: Array.from(new Set(groundingUrls)),
    usedModel: resp?.model || llmConfig.model,
  };
}

async function callOpenAiCompatible(
  provider: LlmProviderId,
  baseUrl: string,
  opts: LlmGenerationOptions
): Promise<LlmGenerationResult> {
  const apiKey = requireProviderApiKey(provider, opts.llmConfig.apiKey);
  const { llmConfig, prompt, systemInstruction, responseKind = 'text' } = opts;

  const sysText =
    systemInstruction ||
    (responseKind !== 'text'
      ? 'You are a precise JSON generator. Return strictly valid JSON with no markdown prose or commentary outside the JSON.'
      : undefined);

  const messages: any[] = [];
  if (sysText) messages.push({ role: 'system', content: sysText });
  messages.push({ role: 'user', content: prompt });

  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const endpoint = normalizedBase.endsWith('/chat/completions')
    ? normalizedBase
    : `${normalizedBase}/chat/completions`;

  const executeChat = async (includeJsonFormat: boolean): Promise<any> => {
    const body: any = {
      model: llmConfig.model,
      messages,
    };
    if (includeJsonFormat && responseKind === 'object') {
      body.response_format = { type: 'json_object' };
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const r = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const errText = await r.text();
      if (includeJsonFormat && (r.status === 400 || r.status === 422)) {
        return executeChat(false);
      }
      throw formatUpstreamProviderHttpError(provider, llmConfig.model, r.status, errText);
    }
    return r.json();
  };

  const resp = await callWithRetry(() => executeChat(responseKind === 'object'));
  const text = resp?.choices?.[0]?.message?.content || '';

  return {
    text: typeof text === 'string' ? text : '',
    groundingUrls: [],
    usedModel: resp?.model || llmConfig.model,
  };
}

async function callOpenAI(opts: LlmGenerationOptions): Promise<LlmGenerationResult> {
  const apiKey = requireProviderApiKey('openai', opts.llmConfig.apiKey);
  const { llmConfig, prompt, systemInstruction, responseKind = 'text', useWebSearch, fileAttachment } = opts;

  const sysText =
    systemInstruction ||
    (responseKind !== 'text'
      ? 'You are a precise JSON generator. Return strictly valid JSON with no markdown prose or commentary outside the JSON.'
      : undefined);

  // Use OpenAI Responses API when live web search or binary file attachments are needed
  if (useWebSearch || fileAttachment) {
    const contentParts: any[] = [];
    if (fileAttachment) {
      contentParts.push({
        type: 'input_file',
        filename: fileAttachment.fileName,
        file_data: `data:${fileAttachment.mimeType};base64,${fileAttachment.base64}`,
      });
    }
    contentParts.push({
      type: 'input_text',
      text: prompt,
    });

    const payload: any = {
      model: llmConfig.model,
      input: [
        {
          role: 'user',
          content: contentParts,
        },
      ],
    };
    if (sysText) payload.instructions = sysText;
    if (useWebSearch) payload.tools = [{ type: 'web_search_preview' }];

    try {
      const resp = await callWithRetry(async () => {
        const r = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        if (!r.ok) {
          const errText = await r.text();
          throw formatUpstreamProviderHttpError('openai', llmConfig.model, r.status, errText);
        }
        return r.json();
      });

      let text = typeof resp?.output_text === 'string' ? resp.output_text : '';
      const groundingUrls: string[] = [];

      if (Array.isArray(resp?.output)) {
        for (const item of resp.output) {
          if (item?.type === 'message' && Array.isArray(item.content)) {
            for (const part of item.content) {
              if (!text && part?.type === 'output_text' && typeof part.text === 'string') {
                text += part.text;
              }
              if (Array.isArray(part?.annotations)) {
                for (const ann of part.annotations) {
                  if (ann?.type === 'url_citation' && typeof ann?.url === 'string') {
                    groundingUrls.push(ann.url);
                  }
                }
              }
            }
          }
        }
      }

      return {
        text,
        groundingUrls: Array.from(new Set(groundingUrls)),
        usedModel: resp?.model || llmConfig.model,
      };
    } catch (err: any) {
      // Fallback to standard Chat Completions if web search tool isn't supported on this model/key
      if (useWebSearch && !fileAttachment && err instanceof LlmHttpError && (err.status === 400 || err.status === 403)) {
        return callOpenAiCompatible('openai', 'https://api.openai.com/v1', { ...opts, useWebSearch: false });
      }
      throw err;
    }
  }

  return callOpenAiCompatible('openai', 'https://api.openai.com/v1', opts);
}

async function callAnthropic(opts: LlmGenerationOptions): Promise<LlmGenerationResult> {
  const apiKey = requireProviderApiKey('anthropic', opts.llmConfig.apiKey);
  const { llmConfig, prompt, systemInstruction, responseKind = 'text', useWebSearch, fileAttachment } = opts;

  const sysText =
    systemInstruction ||
    (responseKind !== 'text'
      ? 'Return strictly valid JSON with no markdown prose or commentary outside the JSON.'
      : undefined);

  const contentParts: any[] = [];
  if (fileAttachment) {
    if (fileAttachment.mimeType.toLowerCase().includes('pdf')) {
      contentParts.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: fileAttachment.base64,
        },
      });
    } else if (fileAttachment.mimeType.startsWith('image/')) {
      contentParts.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: fileAttachment.mimeType,
          data: fileAttachment.base64,
        },
      });
    }
  }
  contentParts.push({ type: 'text', text: prompt });

  const executeAnthropic = async (enableWebSearch: boolean): Promise<any> => {
    const body: any = {
      model: llmConfig.model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: contentParts }],
    };
    if (sysText) body.system = sysText;
    if (enableWebSearch) {
      body.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }];
    }

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const errText = await r.text();
      if (enableWebSearch && (r.status === 400 || r.status === 403 || r.status === 404)) {
        return executeAnthropic(false);
      }
      throw formatUpstreamProviderHttpError('anthropic', llmConfig.model, r.status, errText);
    }
    return r.json();
  };

  const resp = await callWithRetry(() => executeAnthropic(Boolean(useWebSearch)));

  let text = '';
  const groundingUrls: string[] = [];

  if (Array.isArray(resp?.content)) {
    for (const block of resp.content) {
      if (block?.type === 'text' && typeof block.text === 'string') {
        text += (text ? '\n' : '') + block.text;
        if (Array.isArray(block.citations)) {
          for (const cit of block.citations) {
            if (typeof cit?.url === 'string' && cit.url.length > 0) {
              groundingUrls.push(cit.url);
            }
          }
        }
      } else if (block?.type === 'web_search_tool_result' && Array.isArray(block.content)) {
        for (const item of block.content) {
          if (typeof item?.url === 'string' && item.url.length > 0) {
            groundingUrls.push(item.url);
          }
        }
      }
    }
  }

  return {
    text,
    groundingUrls: Array.from(new Set(groundingUrls)),
    usedModel: resp?.model || llmConfig.model,
  };
}

interface PublicFeedJob {
  title: string;
  company: string;
  location: string;
  salary: string;
  jobType: string;
  source: string;
  sourceUrl: string;
  postedDate: string;
  description: string;
  tags: string[];
}

async function fetchLivePublicJobFeeds(titles: string[], keywords: string[]): Promise<PublicFeedJob[]> {
  const queryTokens = [...titles, ...keywords]
    .map((s) => String(s || '').toLowerCase().trim())
    .filter((s) => s.length >= 2);
  const searchTerm = encodeURIComponent((titles[0] || keywords[0] || 'software').split(' ').slice(0, 2).join(' '));
  const tagTerm = encodeURIComponent((keywords[0] || 'dev').toLowerCase().replace(/[^a-z0-9]/g, ''));

  const jobs: PublicFeedJob[] = [];

  const [remotiveRes, arbeitnowRes, jobicyRes] = await Promise.allSettled([
    fetch(`https://remotive.com/api/remote-jobs?search=${searchTerm}&limit=15`, {
      signal: AbortSignal.timeout(5500),
    }).then((r) => (r.ok ? r.json() : null)),
    fetch('https://www.arbeitnow.com/api/job-board-api', {
      signal: AbortSignal.timeout(5500),
    }).then((r) => (r.ok ? r.json() : null)),
    fetch(`https://jobicy.com/api/v2/remote-jobs?count=15${tagTerm ? `&tag=${tagTerm}` : ''}`, {
      signal: AbortSignal.timeout(5500),
    }).then((r) => (r.ok ? r.json() : null)),
  ]);

  if (remotiveRes.status === 'fulfilled' && Array.isArray(remotiveRes.value?.jobs)) {
    for (const j of remotiveRes.value.jobs.slice(0, 15)) {
      jobs.push({
        title: String(j.title || ''),
        company: String(j.company_name || ''),
        location: String(j.candidate_required_location || 'Remote (Worldwide)'),
        salary: String(j.salary || 'Competitive'),
        jobType: String(j.job_type || 'Full-time'),
        source: 'Direct Board',
        sourceUrl: String(j.url || ''),
        postedDate: String(j.publication_date || '').slice(0, 10) || 'Recently',
        description: String(j.description || '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 900),
        tags: Array.isArray(j.tags) ? j.tags.slice(0, 8) : [],
      });
    }
  }

  if (arbeitnowRes.status === 'fulfilled' && Array.isArray(arbeitnowRes.value?.data)) {
    for (const j of arbeitnowRes.value.data.slice(0, 25)) {
      jobs.push({
        title: String(j.title || ''),
        company: String(j.company_name || ''),
        location: j.remote ? 'Remote' : String(j.location || 'Hybrid'),
        salary: 'See listing',
        jobType: Array.isArray(j.job_types) && j.job_types[0] ? String(j.job_types[0]) : 'Full-time',
        source: 'Direct Board',
        sourceUrl: String(j.url || ''),
        postedDate: 'Recently',
        description: String(j.description || '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 900),
        tags: Array.isArray(j.tags) ? j.tags.slice(0, 8) : [],
      });
    }
  }

  if (jobicyRes.status === 'fulfilled' && Array.isArray(jobicyRes.value?.jobs)) {
    for (const j of jobicyRes.value.jobs.slice(0, 15)) {
      jobs.push({
        title: String(j.jobTitle || ''),
        company: String(j.companyName || ''),
        location: String(j.jobGeo || 'Remote'),
        salary: j.annualSalaryMin ? `$${j.annualSalaryMin} - $${j.annualSalaryMax || j.annualSalaryMin}` : 'Competitive',
        jobType: Array.isArray(j.jobType) && j.jobType[0] ? String(j.jobType[0]) : 'Full-time',
        source: 'Direct Board',
        sourceUrl: String(j.url || ''),
        postedDate: String(j.pubDate || '').slice(0, 10) || 'Recently',
        description: String(j.jobExcerpt || j.jobDescription || '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 900),
        tags: Array.isArray(j.jobIndustry) ? j.jobIndustry.slice(0, 5) : [],
      });
    }
  }

  const scored = jobs
    .filter((j) => j.title && j.company && j.sourceUrl)
    .map((j) => {
      const hay = `${j.title} ${j.description} ${j.tags.join(' ')}`.toLowerCase();
      const hits = queryTokens.reduce((acc, t) => acc + (hay.includes(t) ? 1 : 0), 0);
      return { j, hits };
    })
    .sort((a, b) => b.hits - a.hits);

  return scored.slice(0, 18).map((x) => x.j);
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.set('trust proxy', 1);
  app.use(express.json({ limit: '10mb' }));

  // Server-side rate limiting & daily AI cap to protect host API keys from runaway public billing
  const RATE_LIMIT_WINDOW_MS = Math.max(10_000, Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000);
  const RATE_LIMIT_MAX_PER_IP = Math.max(1, Number(process.env.RATE_LIMIT_MAX_PER_IP) || 12);
  const MAX_DAILY_AI_REQUESTS = Math.max(1, Number(process.env.MAX_DAILY_AI_REQUESTS) || 250);

  const ipRequestWindows = new Map<string, number[]>();
  let dailyUsageDate = new Date().toISOString().slice(0, 10);
  let dailyAiRequestCount = 0;

  const getDailyUsageStatus = () => {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== dailyUsageDate) {
      dailyUsageDate = today;
      dailyAiRequestCount = 0;
    }
    return {
      date: dailyUsageDate,
      usedToday: dailyAiRequestCount,
      maxDailyRequests: MAX_DAILY_AI_REQUESTS,
      dailyRemaining: Math.max(0, MAX_DAILY_AI_REQUESTS - dailyAiRequestCount),
      perIpPerMinute: RATE_LIMIT_MAX_PER_IP,
    };
  };

  app.use('/api/agent', (req, res, next) => {
    const now = Date.now();
    const usage = getDailyUsageStatus();
    if (usage.usedToday >= MAX_DAILY_AI_REQUESTS) {
      return res.status(429).json({
        success: false,
        error: `Daily server AI request cap (${MAX_DAILY_AI_REQUESTS}/day) reached to protect host API quota. Try again tomorrow or self-host with your own .env keys.`,
      });
    }

    const clientIp = String(req.ip || req.socket.remoteAddress || 'unknown');
    const recent = (ipRequestWindows.get(clientIp) || []).filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
    if (recent.length >= RATE_LIMIT_MAX_PER_IP) {
      return res.status(429).json({
        success: false,
        error: `Rate limit reached (${RATE_LIMIT_MAX_PER_IP} AI requests/min per user). Please wait a few seconds before trying again.`,
      });
    }

    recent.push(now);
    ipRequestWindows.set(clientIp, recent);
    dailyAiRequestCount += 1;
    next();
  });

  // Helper to initialize Google GenAI SDK (Server-Side Only)
  const getGenAI = () => {
    const apiKey = requireProviderApiKey('gemini');
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  };

  // Dedicated v1beta client required by Decisions API (gemini-decision-1)
  const getDecisionsAI = () => {
    const apiKey = requireProviderApiKey('gemini');
    return new GoogleGenAI({
      apiKey,
      apiVersion: 'v1beta',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  };

  const DECISION_SKILLS_RUBRIC = [
    'Missing almost all required technical skills and domain background.',
    'Partial overlap with secondary tools; missing core technical requirements.',
    'Moderate fit with several matching core skills, minor gaps in stack.',
    'Strong fit covering most required technologies and workflows.',
    'Exceptional match covering virtually all required skills and domain stack.',
  ];

  const DECISION_EXPERIENCE_RUBRIC = [
    'Experience level and seniority clearly mismatch job requirements.',
    'Slightly under- or over-leveled relative to the requested seniority.',
    'Aligned with the requested experience level and responsibilities.',
    'Ideal experience level and directly relevant role background.',
  ];

  const DECISION_EDUCATION_RUBRIC = [
    'Does not satisfy stated degree or certification requirements.',
    'Partially satisfies or relies on equivalent practical experience.',
    'Satisfies stated educational background.',
    'Exceeds or directly matches preferred degree and certifications.',
  ];

  const DECISION_DOMAIN_RUBRIC = [
    'Unrelated industry/domain background.',
    'Adjacent domain with transferable fundamentals.',
    'Strong domain alignment based on projects or prior roles.',
    'Direct hands-on domain expertise matching the role.',
  ];

  const normalizeRubricScore = (rawScore: number, levelsCount: number): number => {
    if (levelsCount <= 1) return 0;
    return Math.min(100, Math.max(0, Math.round((rawScore / (levelsCount - 1)) * 100)));
  };

  async function evaluateJobWithDecisionModel(job: any, userProfile: any) {
    const decisionsAi = getDecisionsAI();
    const candidatePayload = {
      name: userProfile?.fullName || '',
      experienceLevel: userProfile?.experienceLevel || 'entry',
      yearsExperience: userProfile?.yearsExperience || 0,
      skills: Array.isArray(userProfile?.skills) ? userProfile.skills : [],
      education: Array.isArray(userProfile?.education) ? userProfile.education : [],
      workHistory: Array.isArray(userProfile?.workHistory) ? userProfile.workHistory : [],
      projects: Array.isArray(userProfile?.projects) ? userProfile.projects : [],
      summary: userProfile?.customBio || '',
      masterCV: String(userProfile?.masterCV || '').slice(0, 6000),
    };
    const jobPayload = {
      title: job?.title || '',
      company: job?.company || '',
      location: job?.location || '',
      jobType: job?.jobType || '',
      experienceReq: job?.experienceReq || '',
      requiredSkills: Array.isArray(job?.requiredSkills) ? job.requiredSkills : [],
      description: String(job?.description || '').slice(0, 6000),
    };

    const result = await callWithRetry(() =>
      decisionsAi.decisions.create({
        model: DECISION_MODEL,
        input: [
          { type: 'text', text: `CANDIDATE_PROFILE:\n${JSON.stringify(candidatePayload)}\n\n` },
          { type: 'text', text: `JOB_LISTING:\n${JSON.stringify(jobPayload)}` },
        ],
        questions: {
          skills_fit: {
            type: 'score',
            instructions:
              'Evaluate how well the candidate skills, projects, and masterCV match the requiredSkills and technical needs of JOB_LISTING.',
            criteria: DECISION_SKILLS_RUBRIC,
          },
          experience_fit: {
            type: 'score',
            instructions:
              'Evaluate how well the candidate yearsExperience, experienceLevel, and workHistory match the seniority and experienceReq of JOB_LISTING.',
            criteria: DECISION_EXPERIENCE_RUBRIC,
          },
          education_fit: {
            type: 'score',
            instructions:
              'Evaluate how well the candidate education and certifications match JOB_LISTING requirements.',
            criteria: DECISION_EDUCATION_RUBRIC,
          },
          domain_fit: {
            type: 'score',
            instructions:
              'Evaluate how closely the candidate domain background and projects align with the product and role of JOB_LISTING.',
            criteria: DECISION_DOMAIN_RUBRIC,
          },
          should_apply: {
            type: 'noul',
            instructions:
              'Should this candidate invest time tailoring an application for JOB_LISTING?',
            criteria: {
              true_description:
                'Candidate meets core skills and experience range with a realistic chance of advancing.',
              false_description:
                'Major skill mismatch, wrong seniority tier, or clear disqualifying requirement.',
            },
          },
          remote_eligible: {
            type: 'noul',
            instructions:
              'Is JOB_LISTING open to remote / distributed work rather than strictly requiring daily on-site presence?',
            criteria: {
              true_description: 'Explicitly remote, work from home, or distributed.',
              false_description: 'Explicitly on-site only or strictly restricted in-office attendance.',
            },
          },
          non_voice_compliant: {
            type: 'noul',
            instructions:
              'Is JOB_LISTING a non-voice technical/operational role rather than cold calling, telemarketing, or phone-support?',
            criteria: {
              true_description: 'Software, engineering, product, ops, async, or written-first role.',
              false_description: 'Cold calling, outbound phone sales, telemarketing, or call-center support.',
            },
          },
          seniority_track: {
            type: 'choice',
            instructions: 'Which seniority track best describes JOB_LISTING?',
            criteria: {
              fresher: '0-1 years experience, intern, graduate, or fresher role.',
              entry: '1-2 years experience or junior role.',
              mid: '2-5 years experience or mid-level individual contributor.',
              senior: '5+ years experience, lead, staff, or principal role.',
              other: 'Unclear or non-standard seniority.',
            },
          },
        },
      })
    );

    if (!result.answers) {
      throw new LlmHttpError(
        400,
        `Decision evaluation returned no answers (${JSON.stringify(result.prompt_feedback || 'blocked')}).`
      );
    }

    const skillsAns = result.answers.skills_fit;
    const expAns = result.answers.experience_fit;
    const eduAns = result.answers.education_fit;
    const domAns = result.answers.domain_fit;
    const shouldAns = result.answers.should_apply;
    const remoteAns = result.answers.remote_eligible;
    const nonVoiceAns = result.answers.non_voice_compliant;
    const trackAns = result.answers.seniority_track;

    const skillsMatchScore =
      skillsAns?.type === 'score' ? normalizeRubricScore(skillsAns.score, DECISION_SKILLS_RUBRIC.length) : 75;
    const experienceMatchScore =
      expAns?.type === 'score' ? normalizeRubricScore(expAns.score, DECISION_EXPERIENCE_RUBRIC.length) : 75;
    const educationMatchScore =
      eduAns?.type === 'score' ? normalizeRubricScore(eduAns.score, DECISION_EDUCATION_RUBRIC.length) : 80;
    const domainKnowledgeScore =
      domAns?.type === 'score' ? normalizeRubricScore(domAns.score, DECISION_DOMAIN_RUBRIC.length) : 75;

    const overallScore = Math.min(
      100,
      Math.max(
        0,
        Math.round(
          skillsMatchScore * 0.4 +
            experienceMatchScore * 0.25 +
            domainKnowledgeScore * 0.2 +
            educationMatchScore * 0.15
        )
      )
    );

    const shouldApplyProbability =
      shouldAns?.type === 'noul' ? Math.round(shouldAns.noul * 100) : overallScore;
    const confidence =
      shouldAns?.type === 'noul' ? Math.round(shouldAns.confidence * 100) : 75;

    return {
      overallScore,
      scoreBreakdown: {
        skillsMatchScore,
        experienceMatchScore,
        educationMatchScore,
        domainKnowledgeScore,
      },
      decisionCalibration: {
        model: DECISION_MODEL,
        shouldApplyProbability,
        confidence,
        seniorityTrack: trackAns?.type === 'choice' ? trackAns.choice : 'entry',
        remoteEligible: remoteAns?.type === 'noul' ? remoteAns.noul >= 0.5 : undefined,
        nonVoiceCompliant: nonVoiceAns?.type === 'noul' ? nonVoiceAns.noul >= 0.5 : undefined,
        totalOutputTokens: result.usage?.total_output_tokens ?? 0,
      },
    };
  }

  async function batchScreenJobsWithDecisionModel(jobs: any[], userProfile: any) {
    if (!Array.isArray(jobs) || jobs.length === 0) return [];
    const decisionsAi = getDecisionsAI();
    const candidatePayload = {
      name: userProfile?.fullName || '',
      experienceLevel: userProfile?.experienceLevel || 'entry',
      yearsExperience: userProfile?.yearsExperience || 0,
      skills: Array.isArray(userProfile?.skills) ? userProfile.skills : [],
      summary: userProfile?.customBio || '',
    };

    const indexedJobs = jobs.slice(0, 12);
    const inputBlocks: Array<{ type: 'text'; text: string }> = [
      { type: 'text', text: `CANDIDATE_PROFILE:\n${JSON.stringify(candidatePayload)}\n\n` },
    ];

    const questions: Record<string, any> = {};
    const fitRubric = [
      'Poor match: candidate lacks most required skills or wrong seniority.',
      'Partial match: some overlapping skills, notable gaps.',
      'Good match: candidate meets core skills and experience tier.',
      'Strong match: high overlap across skills, stack, and seniority.',
    ];

    indexedJobs.forEach((job, idx) => {
      const compactJob = {
        index: idx,
        title: job?.title || '',
        company: job?.company || '',
        location: job?.location || '',
        experienceReq: job?.experienceReq || '',
        requiredSkills: Array.isArray(job?.requiredSkills) ? job.requiredSkills : [],
        description: String(job?.description || '').slice(0, 1500),
      };
      inputBlocks.push({
        type: 'text',
        text: `JOB_${idx} (${compactJob.title} at ${compactJob.company}):\n${JSON.stringify(compactJob)}\n\n`,
      });

      questions[`j${idx}_fit`] = {
        type: 'score',
        instructions: `Rate ONLY JOB_${idx} ("${compactJob.title}" at "${compactJob.company}") against CANDIDATE_PROFILE on overall fit.`,
        criteria: fitRubric,
      };
      questions[`j${idx}_apply`] = {
        type: 'noul',
        instructions: `Should CANDIDATE_PROFILE apply to JOB_${idx} ("${compactJob.title}" at "${compactJob.company}")?`,
        criteria: {
          true_description: 'Core skills and experience align well enough to apply.',
          false_description: 'Clear skill mismatch or seniority disqualifier.',
        },
      };
      questions[`j${idx}_remote`] = {
        type: 'noul',
        instructions: `Is JOB_${idx} ("${compactJob.title}" at "${compactJob.company}") remote-friendly?`,
      };
      questions[`j${idx}_nonvoice`] = {
        type: 'noul',
        instructions: `Is JOB_${idx} ("${compactJob.title}" at "${compactJob.company}") a non-voice role (not cold-calling or telemarketing)?`,
      };
    });

    const result = await callWithRetry(() =>
      decisionsAi.decisions.create({
        model: DECISION_MODEL,
        input: inputBlocks,
        questions,
      })
    );

    if (!result.answers) {
      return jobs;
    }

    return jobs.map((job, idx) => {
      if (idx >= indexedJobs.length) return job;
      const fitAns = result.answers?.[`j${idx}_fit`];
      const applyAns = result.answers?.[`j${idx}_apply`];
      const remoteAns = result.answers?.[`j${idx}_remote`];
      const nonVoiceAns = result.answers?.[`j${idx}_nonvoice`];

      const rubricScore =
        fitAns?.type === 'score' ? normalizeRubricScore(fitAns.score, fitRubric.length) : job.matchScore;
      const shouldApplyProbability =
        applyAns?.type === 'noul' ? Math.round(applyAns.noul * 100) : rubricScore;
      const confidence = applyAns?.type === 'noul' ? Math.round(applyAns.confidence * 100) : 75;
      const calibratedScore = Math.min(100, Math.max(0, Math.round(rubricScore * 0.65 + shouldApplyProbability * 0.35)));

      return {
        ...job,
        matchScore: calibratedScore,
        decisionCalibration: {
          model: DECISION_MODEL,
          shouldApplyProbability,
          confidence,
          remoteEligible: remoteAns?.type === 'noul' ? remoteAns.noul >= 0.5 : undefined,
          nonVoiceCompliant: nonVoiceAns?.type === 'noul' ? nonVoiceAns.noul >= 0.5 : undefined,
          totalOutputTokens: result.usage?.total_output_tokens ?? 0,
        },
      };
    });
  }

  async function runLlmGeneration(opts: LlmGenerationOptions): Promise<LlmGenerationResult> {
    const { llmConfig } = opts;

    if (llmConfig.provider === 'openrouter') {
      return callOpenRouter(opts);
    }
    if (llmConfig.provider === 'openai') {
      return callOpenAI(opts);
    }
    if (llmConfig.provider === 'anthropic') {
      return callAnthropic(opts);
    }
    if (
      llmConfig.provider === 'groq' ||
      llmConfig.provider === 'deepseek' ||
      llmConfig.provider === 'together' ||
      llmConfig.provider === 'mistral'
    ) {
      const base = PROVIDER_ENV_META[llmConfig.provider].baseUrl!;
      return callOpenAiCompatible(llmConfig.provider, base, opts);
    }
    if (llmConfig.provider === 'custom') {
      const safeBase = await validateCustomBaseUrl(llmConfig.baseUrl || PROVIDER_ENV_META.custom.baseUrl || '');
      return callOpenAiCompatible('custom', safeBase, opts);
    }

    // Internal fallback only if explicitly requested by legacy clients
    const ai = getGenAI();
    const contents: any = opts.fileAttachment
      ? [
          {
            inlineData: {
              data: opts.fileAttachment.base64,
              mimeType: opts.fileAttachment.mimeType,
            },
          },
          opts.prompt,
        ]
      : opts.prompt;

    const buildConfig = (targetModel: string) => {
      const config: Record<string, any> = {};
      if (opts.systemInstruction) config.systemInstruction = opts.systemInstruction;
      if (opts.useWebSearch) {
        config.tools = [{ googleSearch: {} }];
      } else {
        if (opts.responseKind && opts.responseKind !== 'text') {
          config.responseMimeType = 'application/json';
        }
        if (opts.geminiSchema) {
          config.responseSchema = opts.geminiSchema;
        }
      }
      if (targetModel.startsWith('gemini-4-') && !opts.useWebSearch && opts.responseKind !== 'text') {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
      }
      return config;
    };

    const { response, usedModel } =
      opts.useWebSearch || opts.allowGeminiFallback === false
        ? {
            response: await callWithRetry(() =>
              ai.models.generateContent({
                model: llmConfig.model,
                contents,
                config: buildConfig(llmConfig.model),
              })
            ),
            usedModel: llmConfig.model,
          }
        : await generateWithModelFallback(ai, llmConfig.model, (model) => ({
            model,
            contents,
            config: buildConfig(model),
          }));

    const chunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const groundingUrls = chunks
      .map((c: any) => c.web?.uri)
      .filter((uri: unknown): uri is string => typeof uri === 'string' && uri.length > 0);

    return {
      text: response.text || '',
      groundingUrls: Array.from(new Set(groundingUrls)),
      usedModel,
    };
  }

  // API Health Check (read-only boolean provider availability & safe usage limits — never returns secrets)
  app.get('/api/health', (_req, res) => {
    const providers: Record<string, boolean> = {
      openrouter: Boolean(getProviderApiKey('openrouter')),
      openai: Boolean(getProviderApiKey('openai')),
      anthropic: Boolean(getProviderApiKey('anthropic')),
      groq: Boolean(getProviderApiKey('groq')),
      deepseek: Boolean(getProviderApiKey('deepseek')),
      together: Boolean(getProviderApiKey('together')),
      mistral: Boolean(getProviderApiKey('mistral')),
      custom: Boolean(getProviderApiKey('custom') && PROVIDER_ENV_META.custom.baseUrl),
    };

    res.json({
      status: 'ok',
      service: 'AutoApply AI Agent Server',
      aiConfigured: Object.values(providers).some(Boolean),
      providers,
      limits: getDailyUsageStatus(),
      timestamp: new Date().toISOString(),
    });
  });

  // ---------------------------------------------------------------------------
  // OpenRouter 1-Click OAuth PKCE Flow (no manual API key copying required)
  // ---------------------------------------------------------------------------
  interface PendingOpenRouterOAuth {
    codeVerifier: string;
    callbackUrl: string;
    createdAt: number;
    status: 'pending' | 'completed' | 'error';
    claimToken?: string;
    error?: string;
  }
  interface ClaimedOpenRouterKey {
    apiKey: string;
    maskedHint: string;
    userId?: string;
    createdAt: number;
  }

  const pendingOpenRouterOAuth = new Map<string, PendingOpenRouterOAuth>();
  const claimedOpenRouterKeys = new Map<string, ClaimedOpenRouterKey>();

  const pruneExpiredOAuth = () => {
    const now = Date.now();
    for (const [k, v] of pendingOpenRouterOAuth.entries()) {
      if (now - v.createdAt > 10 * 60 * 1000) pendingOpenRouterOAuth.delete(k);
    }
    for (const [k, v] of claimedOpenRouterKeys.entries()) {
      if (now - v.createdAt > 5 * 60 * 1000) claimedOpenRouterKeys.delete(k);
    }
  };

  const resolvePublicAppOrigin = (requestedOrigin?: unknown): string => {
    const fallback = (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
    if (typeof requestedOrigin !== 'string' || !requestedOrigin.trim()) return fallback;
    try {
      const parsed = new URL(requestedOrigin.trim());
      if (parsed.protocol === 'https:') {
        return parsed.origin;
      }
      if (parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) {
        return parsed.origin;
      }
    } catch {
      // Fallback to APP_URL
    }
    return fallback;
  };

  const escapeHtml = (str: string): string =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const maskKeyHint = (rawKey: string): string => {
    const k = rawKey.trim();
    if (!k) return '';
    if (k.length <= 10) return '••••••••';
    return `${k.slice(0, 6)}••••${k.slice(-4)}`;
  };

  app.post('/api/auth/openrouter/start', (req, res) => {
    pruneExpiredOAuth();
    const origin = resolvePublicAppOrigin(req.body?.origin);
    const state = crypto.randomBytes(16).toString('hex');
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    const callbackUrl = `${origin}/api/auth/openrouter/callback/${state}`;

    pendingOpenRouterOAuth.set(state, {
      codeVerifier,
      callbackUrl,
      createdAt: Date.now(),
      status: 'pending',
    });

    const params = new URLSearchParams({
      callback_url: callbackUrl,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    res.json({
      success: true,
      state,
      callbackUrl,
      authUrl: `https://openrouter.ai/auth?${params.toString()}`,
    });
  });

  const handleOpenRouterCallback = async (req: express.Request, res: express.Response) => {
    pruneExpiredOAuth();
    const state = String(req.params.state || '').trim();
    const code = typeof req.query.code === 'string' ? req.query.code.trim() : '';
    const entry = state ? pendingOpenRouterOAuth.get(state) : undefined;

    const sendPopupHtml = (
      ok: boolean,
      payload: Record<string, string>,
      heading: string,
      detail: string
    ) => {
      const safeJson = JSON.stringify(payload).replace(/</g, '\\u003c');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(ok ? 200 : 400).send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>OpenRouter Connection</title>
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; background: #09090b; color: #f4f4f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; }
      .card { max-width: 420px; background: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 24px; text-align: center; }
      h1 { font-size: 18px; margin: 0 0 8px; }
      p { font-size: 14px; color: #a1a1aa; margin: 0 0 16px; line-height: 1.5; }
      button { background: #2563eb; color: #fff; border: 0; border-radius: 10px; padding: 10px 18px; font-size: 14px; font-weight: 600; cursor: pointer; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${escapeHtml(heading)}</h1>
      <p>${escapeHtml(detail)}</p>
      <button type="button" onclick="window.close()">Close Window</button>
    </div>
    <script>
      try {
        if (window.opener) {
          window.opener.postMessage(${safeJson}, '*');
          setTimeout(function () { window.close(); }, 350);
        }
      } catch (e) {}
    </script>
  </body>
</html>`);
    };

    if (!entry || entry.status !== 'pending') {
      return sendPopupHtml(
        false,
        { type: 'OPENROUTER_OAUTH_ERROR', state, message: 'OAuth session expired or invalid. Please retry.' },
        'Session Expired',
        'This OpenRouter sign-in session expired or was already used. Close this window and click Connect with OpenRouter again.'
      );
    }

    if (!code) {
      entry.status = 'error';
      entry.error = 'Authorization was cancelled or no code was returned.';
      return sendPopupHtml(
        false,
        { type: 'OPENROUTER_OAUTH_ERROR', state, message: entry.error },
        'Authorization Cancelled',
        entry.error
      );
    }

    try {
      const exchangeResp = await fetch('https://openrouter.ai/api/v1/auth/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          code_verifier: entry.codeVerifier,
          code_challenge_method: 'S256',
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!exchangeResp.ok) {
        const errText = await exchangeResp.text();
        entry.status = 'error';
        entry.error = `OpenRouter token exchange failed (${exchangeResp.status}).`;
        console.warn('[openrouter-oauth] Exchange error:', exchangeResp.status, errText.slice(0, 200));
        return sendPopupHtml(
          false,
          { type: 'OPENROUTER_OAUTH_ERROR', state, message: entry.error },
          'Connection Failed',
          entry.error
        );
      }

      const data = await exchangeResp.json();
      const apiKey = typeof data?.key === 'string' ? data.key.trim() : '';
      if (!apiKey) {
        entry.status = 'error';
        entry.error = 'OpenRouter did not return a user key.';
        return sendPopupHtml(
          false,
          { type: 'OPENROUTER_OAUTH_ERROR', state, message: entry.error },
          'Connection Failed',
          entry.error
        );
      }

      const claimToken = crypto.randomBytes(24).toString('hex');
      claimedOpenRouterKeys.set(claimToken, {
        apiKey,
        maskedHint: maskKeyHint(apiKey),
        userId: typeof data?.user_id === 'string' ? data.user_id : undefined,
        createdAt: Date.now(),
      });

      entry.status = 'completed';
      entry.claimToken = claimToken;

      return sendPopupHtml(
        true,
        { type: 'OPENROUTER_OAUTH_SUCCESS', state, claimToken },
        'OpenRouter Connected',
        'Your OpenRouter account is connected to AutoApply AI. You can close this window.'
      );
    } catch (err: any) {
      entry.status = 'error';
      entry.error = err?.message || 'Failed to complete OpenRouter authorization.';
      return sendPopupHtml(
        false,
        { type: 'OPENROUTER_OAUTH_ERROR', state, message: entry.error },
        'Connection Error',
        entry.error
      );
    }
  };

  app.get(['/api/auth/openrouter/callback/:state', '/api/auth/openrouter/callback/:state/'], handleOpenRouterCallback);

  app.get('/api/auth/openrouter/poll/:state', (req, res) => {
    pruneExpiredOAuth();
    const state = String(req.params.state || '').trim();
    const entry = state ? pendingOpenRouterOAuth.get(state) : undefined;
    if (!entry) {
      return res.json({ status: 'expired' });
    }
    if (entry.status === 'completed' && entry.claimToken) {
      return res.json({ status: 'completed', claimToken: entry.claimToken });
    }
    if (entry.status === 'error') {
      return res.json({ status: 'error', error: entry.error || 'OAuth failed.' });
    }
    return res.json({ status: 'pending' });
  });

  app.post('/api/auth/openrouter/claim', (req, res) => {
    pruneExpiredOAuth();
    const claimToken = typeof req.body?.claimToken === 'string' ? req.body.claimToken.trim() : '';
    const state = typeof req.body?.state === 'string' ? req.body.state.trim() : '';

    if (!claimToken) {
      return res.status(400).json({ success: false, error: 'Missing claim token.' });
    }

    const claimed = claimedOpenRouterKeys.get(claimToken);
    if (!claimed) {
      return res.status(404).json({ success: false, error: 'OAuth token expired or already claimed.' });
    }

    claimedOpenRouterKeys.delete(claimToken);
    if (state) pendingOpenRouterOAuth.delete(state);

    return res.json({
      success: true,
      provider: 'openrouter',
      apiKey: claimed.apiKey,
      maskedHint: claimed.maskedHint,
      userId: claimed.userId,
    });
  });

  // Fetch live available models for a provider (supports OpenRouter, OpenAI, Groq, Together, Mistral, Custom)
  app.post('/api/providers/models', async (req, res) => {
    const llmConfig = resolveLlmConfig(req);
    try {
      const apiKey = cleanEnvKey(llmConfig.apiKey) || getProviderApiKey(llmConfig.provider) || '';

      if (llmConfig.provider === 'openrouter') {
        const headers: Record<string, string> = {};
        if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
        const r = await fetch('https://openrouter.ai/api/v1/models', {
          headers,
          signal: AbortSignal.timeout(8000),
        });
        if (!r.ok) {
          const text = await r.text();
          throw formatUpstreamProviderHttpError('openrouter', llmConfig.model, r.status, text);
        }
        const json = await r.json();
        const rawList: any[] = Array.isArray(json?.data) ? json.data : [];
        const models = rawList
          .filter((m) => m?.id && !String(m.id).toLowerCase().includes('gemini'))
          .map((m) => {
            const promptPrice = Number(m?.pricing?.prompt ?? -1);
            const completionPrice = Number(m?.pricing?.completion ?? -1);
            const isFree =
              String(m.id) === 'openrouter/free' ||
              String(m.id).endsWith(':free') ||
              (promptPrice === 0 && completionPrice === 0);
            return {
              id: String(m.id),
              label: String(m.name || m.id),
              note: isFree ? 'Free' : m.context_length ? `${Math.round(m.context_length / 1000)}k ctx` : '',
              isFree,
            };
          })
          .sort((a, b) => Number(b.isFree) - Number(a.isFree));

        return res.json({ success: true, provider: 'openrouter', models });
      }

      if (
        llmConfig.provider === 'openai' ||
        llmConfig.provider === 'groq' ||
        llmConfig.provider === 'together' ||
        llmConfig.provider === 'mistral' ||
        llmConfig.provider === 'custom'
      ) {
        const base =
          llmConfig.provider === 'custom'
            ? await validateCustomBaseUrl(llmConfig.baseUrl || '')
            : PROVIDER_ENV_META[llmConfig.provider].baseUrl!;

        if (!apiKey && llmConfig.provider !== 'custom') {
          throw new LlmHttpError(401, `Enter your ${PROVIDER_ENV_META[llmConfig.provider].label} API key first.`);
        }

        const headers: Record<string, string> = {};
        if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
        const r = await fetch(`${base.replace(/\/+$/, '')}/models`, {
          headers,
          signal: AbortSignal.timeout(8000),
        });
        if (!r.ok) {
          const text = await r.text();
          throw formatUpstreamProviderHttpError(llmConfig.provider, llmConfig.model, r.status, text);
        }
        const json = await r.json();
        const rawList: any[] = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
        const models = rawList
          .filter((m) => m?.id)
          .slice(0, 120)
          .map((m) => ({
            id: String(m.id),
            label: String(m.name || m.id),
            note: m.owned_by ? String(m.owned_by) : undefined,
          }));
        return res.json({ success: true, provider: llmConfig.provider, models });
      }

      return res.json({ success: true, provider: llmConfig.provider, models: [] });
    } catch (error: any) {
      const formatted = formatLlmError(llmConfig.provider, llmConfig.model, error);
      res.status(formatted.status).json({ success: false, error: formatted.message });
    }
  });

  // Test & verify connection for any third-party AI provider
  app.post('/api/providers/test', async (req, res) => {
    const llmConfig = resolveLlmConfig(req);
    try {
      const apiKey = requireProviderApiKey(llmConfig.provider, llmConfig.apiKey);

      if (llmConfig.provider === 'openrouter') {
        const r = await fetch('https://openrouter.ai/api/v1/auth/key', {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(8000),
        });
        if (!r.ok) {
          const errText = await r.text();
          throw formatUpstreamProviderHttpError('openrouter', llmConfig.model, r.status, errText);
        }
        const data = await r.json();
        const isFreeTier = data?.data?.is_free_tier;
        const label = data?.data?.label ? ` (${data.data.label})` : '';
        return res.json({
          success: true,
          provider: 'openrouter',
          message: `OpenRouter connected${label}${isFreeTier ? ' · Free tier ready' : ''}.`,
        });
      }

      if (llmConfig.provider === 'anthropic') {
        const r = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: llmConfig.model,
            max_tokens: 5,
            messages: [{ role: 'user', content: 'Hi' }],
          }),
          signal: AbortSignal.timeout(10000),
        });
        if (!r.ok) {
          const errText = await r.text();
          throw formatUpstreamProviderHttpError('anthropic', llmConfig.model, r.status, errText);
        }
        return res.json({
          success: true,
          provider: 'anthropic',
          message: `Claude (Anthropic) connected with ${llmConfig.model}.`,
        });
      }

      const base =
        llmConfig.provider === 'custom'
          ? await validateCustomBaseUrl(llmConfig.baseUrl || '')
          : PROVIDER_ENV_META[llmConfig.provider].baseUrl!;

      const headers: Record<string, string> = {};
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

      const modelsResp = await fetch(`${base.replace(/\/+$/, '')}/models`, {
        headers,
        signal: AbortSignal.timeout(8000),
      });

      if (modelsResp.ok) {
        return res.json({
          success: true,
          provider: llmConfig.provider,
          message: `${PROVIDER_ENV_META[llmConfig.provider].label} connected and verified.`,
        });
      }

      if (modelsResp.status === 401 || modelsResp.status === 403) {
        const errText = await modelsResp.text();
        throw formatUpstreamProviderHttpError(llmConfig.provider, llmConfig.model, modelsResp.status, errText);
      }

      // Fallback ping for custom endpoints that don't expose GET /models
      const pingResp = await fetch(`${base.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: llmConfig.model,
          max_tokens: 5,
          messages: [{ role: 'user', content: 'Reply OK' }],
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!pingResp.ok) {
        const errText = await pingResp.text();
        throw formatUpstreamProviderHttpError(llmConfig.provider, llmConfig.model, pingResp.status, errText);
      }

      return res.json({
        success: true,
        provider: llmConfig.provider,
        message: `${PROVIDER_ENV_META[llmConfig.provider].label} connected with ${llmConfig.model}.`,
      });
    } catch (error: any) {
      const formatted = formatLlmError(llmConfig.provider, llmConfig.model, error);
      res.status(formatted.status).json({ success: false, error: formatted.message });
    }
  });

  // 1. Multi-Pass Job Search (3 Passes: Live Public Feeds + Grounded Search -> Direct ATS -> Deduplication & Verification)
  app.post('/api/agent/search-indeed-jobs', async (req, res) => {
    const startedAt = Date.now();
    const llmConfig = resolveLlmConfig(req);
    try {
      const {
        titles = ['Junior Software Engineer', 'Frontend Developer'],
        keywords = ['React', 'TypeScript', 'Node.js'],
        locations = ['Remote', 'Worldwide'],
        userProfileSummary = '',
        datePosted = 'anytime',
        jobType = 'all',
        experienceLevel = 'entry',
        minSalary = 'any',
        locationType = 'remote_only',
        companyType = 'direct_only',
        sortBy = 'relevance',
        nonVoiceOnly = false,
        excludedCompanies = [],
      } = req.body || {};

      // Validate key upfront before running multi-pass search
      requireProviderApiKey(llmConfig.provider, llmConfig.apiKey);

      const dateFilterLabel =
        datePosted === '24h'
          ? 'Last 24 Hours'
          : datePosted === '3d'
            ? 'Last 3 Days'
            : datePosted === '7d'
              ? 'Last 7 Days'
              : datePosted === '14d'
                ? 'Last 14 Days'
                : 'Anytime';

      const expFilterLabel =
        experienceLevel === 'fresher'
          ? 'Fresher / Entry Level (0-1 Yrs)'
          : experienceLevel === 'entry'
            ? 'Entry Level (0-2 Yrs)'
            : experienceLevel === 'mid'
              ? 'Mid Level (2-5 Yrs)'
              : experienceLevel === 'senior'
                ? 'Senior Level (5+ Yrs)'
                : 'All Experience Levels';

      const targetTitlesText =
        Array.isArray(titles) && titles.length > 0 ? titles.join(', ') : 'Software Engineer';
      const targetKeywordsText =
        Array.isArray(keywords) && keywords.length > 0 ? keywords.join(', ') : 'General';
      const locationConstraintText =
        locationType === 'remote_only'
          ? '100% Remote / Work From Home / Worldwide (exclude US-only or onsite-restricted postings unless explicitly global remote)'
          : Array.isArray(locations) && locations.length > 0
            ? locations.join(', ')
            : 'Remote or Hybrid';
      const nonVoiceRule = nonVoiceOnly
        ? 'Strictly EXCLUDE cold-calling, outbound phone sales, telemarketing, or phone customer support roles.'
        : 'Standard communication requirements.';
      const excludedText =
        Array.isArray(excludedCompanies) && excludedCompanies.length > 0
          ? excludedCompanies.join(', ')
          : 'None';
      const salaryText =
        minSalary !== 'any' ? `$${String(minSalary).replace('k', ',000')}+ / year` : 'Any Salary Range';

      const sharedFiltersBlock = `
SEARCH PARAMETERS:
- Target Job Titles: ${targetTitlesText}
- Key Skills / Keywords: ${targetKeywordsText}
- Location Requirement: ${locationConstraintText}
- Date Posted Window: ${dateFilterLabel}
- Job Type: ${String(jobType).toUpperCase()}
- Experience Level: ${expFilterLabel}
- Minimum Salary: ${salaryText}
- Employer Preference: ${companyType === 'direct_only' ? 'Prefer Direct Employers over staffing agencies' : 'Direct Employers and Staffing Agencies'}
- Communication Rule: ${nonVoiceRule}
- Excluded Companies: ${excludedText}
- Candidate Summary: ${userProfileSummary || 'Motivated candidate seeking matching opportunities'}
- Sort Priority: ${sortBy === 'date' ? 'Newest Listings First' : 'Highest Relevance'}`;

      const itemSchemaDescription = `
Return strictly a valid JSON array of up to 6 distinct job listings (no markdown prose outside JSON):
[
  {
    "title": "Exact job title",
    "company": "Company name",
    "location": "Location e.g. Remote (Worldwide)",
    "salary": "Salary range or Competitive",
    "jobType": "Full-time Remote",
    "experienceReq": "Entry Level / 0-2 Yrs",
    "source": "Indeed | LinkedIn | Glassdoor | Company Careers | Direct Board",
    "sourceUrl": "Direct URL to listing from live feed or grounded results",
    "postedDate": "e.g. 2 days ago",
    "description": "Clear 2-paragraph summary of responsibilities and qualifications",
    "requiredSkills": ["Skill 1", "Skill 2", "Skill 3"],
    "companyDomain": "company.com",
    "matchScore": 88,
    "matchReasoning": "Concise explanation of fit against candidate profile and filters",
    "applyMethod": "company_portal"
  }
]`;

      const isFatalAuthOrQuotaError = (err: any): boolean => {
        const { status } = formatLlmError(llmConfig.provider, llmConfig.model, err);
        return status === 401 || status === 402 || status === 403 || status === 404 || status === 429 || status === 503;
      };

      const hasNativeSearch =
        (llmConfig.provider === 'openai' || llmConfig.provider === 'anthropic') ||
        (llmConfig.provider === 'openrouter' &&
          llmConfig.model !== 'openrouter/free' &&
          !llmConfig.model.endsWith(':free'));

      // Fetch live public job feeds in parallel so every third-party provider has real active listings
      const publicFeedJobs = await fetchLivePublicJobFeeds(
        Array.isArray(titles) ? titles : [],
        Array.isArray(keywords) ? keywords : []
      );
      const feedUrls = publicFeedJobs.map((j) => j.sourceUrl).filter(Boolean);

      let passesExecuted = 0;
      let pass1Jobs: any[] = [];
      let pass2Jobs: any[] = [];
      const collectedUrls: string[] = [...feedUrls];

      const liveFeedContext =
        publicFeedJobs.length > 0
          ? `\nLIVE ACTIVE JOB FEED RESULTS (${publicFeedJobs.length} real openings fetched right now):\n${JSON.stringify(
              publicFeedJobs,
              null,
              2
            )}\nPrioritize and select the best-matching real listings from these live openings (preserving their exact sourceUrl), plus any additional verified openings.`
          : '';

      // PASS 1: Major Job Boards & Live Feed Discovery
      const pass1Prompt = `
You are Pass 1 of a multi-stage AI Job Hunting Agent.
Identify and rank active job postings matching these parameters:
${sharedFiltersBlock}
${liveFeedContext}
${itemSchemaDescription}`;

      const pass1Resp = await runLlmGeneration({
        llmConfig,
        prompt: pass1Prompt,
        responseKind: 'array',
        useWebSearch: hasNativeSearch,
        allowGeminiFallback: false,
      });
      passesExecuted += 1;
      collectedUrls.push(...pass1Resp.groundingUrls);
      pass1Jobs = extractJsonArray(pass1Resp.text) || [];

      // PASS 2: Direct ATS & Company Career Portals Search (when provider supports live search)
      if (hasNativeSearch) {
        try {
          const pass2Prompt = `
You are Pass 2 of a multi-stage AI Job Hunting Agent focusing on DIRECT COMPANY CAREER PORTALS & ATS BOARDS.
Use live web search targeting Greenhouse (boards.greenhouse.io), Lever (jobs.lever.co), Ashby (jobs.ashbyhq.com), Workable, and official company /careers pages—avoiding duplicate listings.
${sharedFiltersBlock}
${itemSchemaDescription}`;

          const pass2Resp = await runLlmGeneration({
            llmConfig,
            prompt: pass2Prompt,
            responseKind: 'array',
            useWebSearch: true,
            allowGeminiFallback: false,
          });
          passesExecuted += 1;
          collectedUrls.push(...pass2Resp.groundingUrls);
          pass2Jobs = extractJsonArray(pass2Resp.text) || [];
        } catch (pass2Error: any) {
          if (isFatalAuthOrQuotaError(pass2Error)) {
            throw pass2Error;
          }
          console.warn('Pass 2 ATS search non-fatal warning:', pass2Error?.message || pass2Error);
        }
      }

      const uniqueSourceUrls = Array.from(new Set(collectedUrls));
      let combinedCandidates = [...pass1Jobs, ...pass2Jobs];

      // If LLM formatting returned empty but public feeds succeeded, use public feed items directly
      if (combinedCandidates.length === 0 && publicFeedJobs.length > 0) {
        combinedCandidates = publicFeedJobs.slice(0, 6).map((j) => ({
          title: j.title,
          company: j.company,
          location: j.location,
          salary: j.salary,
          jobType: j.jobType,
          experienceReq: expFilterLabel,
          source: j.source,
          sourceUrl: j.sourceUrl,
          postedDate: j.postedDate,
          description: j.description,
          requiredSkills: j.tags.length > 0 ? j.tags : Array.isArray(keywords) ? keywords.slice(0, 4) : [],
          companyDomain: '',
          matchScore: 82,
          matchReasoning: 'Matched from live remote/tech job feeds.',
          applyMethod: 'company_portal',
        }));
      }

      if (combinedCandidates.length === 0) {
        return res.status(502).json({
          success: false,
          error:
            'Could not find structured job listings across search passes. Try broadening your titles, keywords, or date window.',
        });
      }

      // PASS 3: Consolidation, Deduplication, Strict Filter Audit & Fit Scoring
      let finalVerifiedJobs: any[] = combinedCandidates;
      let auditSummary = `Consolidated ${combinedCandidates.length} candidates across ${passesExecuted} search pass(es) (${llmConfig.provider}:${llmConfig.model}).`;

      try {
        const pass3Prompt = `
You are Pass 3 (Verification & Deduplication Auditor) of a Job Search Agent.
Review the combined job candidates and verified URLs.

CANDIDATE & FILTER RULES TO ENFORCE:
${sharedFiltersBlock}

COLLECTED GROUNDING URLS:
${uniqueSourceUrls.slice(0, 25).join('\n') || 'None'}

RAW CANDIDATE LISTINGS (${combinedCandidates.length} total):
${JSON.stringify(combinedCandidates, null, 2)}

TASKS:
1. Deduplicate any overlapping roles (same company + same/near-identical role title).
2. Remove any listing from excluded companies: ${excludedText}.
3. ${nonVoiceOnly ? 'Strictly remove any cold-calling, telemarketing, or phone-support roles.' : 'Keep standard roles.'}
4. ${locationType === 'remote_only' ? 'Remove strictly onsite roles that conflict with Remote/Worldwide.' : 'Keep location-aligned roles.'}
5. Preserve verified sourceUrls; provide clean 2-paragraph descriptions and accurate requiredSkills.
6. Rank the best 5 to 8 verified listings according to ${sortBy === 'date' ? 'newest postedDate first' : 'highest matchScore first'}.

Return strictly a valid JSON object matching this exact schema (no markdown prose):
{
  "auditSummary": "Brief summary of deduplication and filter verification",
  "verifiedJobs": [
    {
      "title": "Exact job title",
      "company": "Company name",
      "location": "Location",
      "salary": "Salary range or Competitive",
      "jobType": "Full-time Remote",
      "experienceReq": "Entry Level",
      "source": "Indeed | LinkedIn | Glassdoor | Company Careers | Direct Board",
      "sourceUrl": "Direct URL",
      "postedDate": "e.g. 2 days ago",
      "description": "Clear 2-paragraph summary",
      "requiredSkills": ["Skill 1", "Skill 2"],
      "companyDomain": "company.com",
      "matchScore": 88,
      "matchReasoning": "Concise explanation of fit",
      "applyMethod": "company_portal"
    }
  ]
}`;

        const pass3Resp = await runLlmGeneration({
          llmConfig,
          prompt: pass3Prompt,
          responseKind: 'object',
        });

        passesExecuted += 1;
        const consolidated = extractJsonObject<{ auditSummary?: string; verifiedJobs?: any[] }>(
          pass3Resp.text
        );
        if (consolidated?.verifiedJobs && consolidated.verifiedJobs.length > 0) {
          finalVerifiedJobs = consolidated.verifiedJobs;
          if (consolidated.auditSummary) {
            auditSummary = consolidated.auditSummary;
          }
        }
      } catch (pass3Error: any) {
        if (isFatalAuthOrQuotaError(pass3Error)) {
          throw pass3Error;
        }
        console.warn('Pass 3 consolidation fallback to combined results:', pass3Error?.message || pass3Error);
      }

      const enrichedJobs = finalVerifiedJobs.slice(0, 8).map((j: any, idx: number) => ({
        id: `job_search_${Date.now()}_${idx}`,
        title: j.title || 'Open Role',
        company: j.company || 'Company',
        location: j.location || 'Remote',
        salary: j.salary || 'Competitive',
        jobType: j.jobType || 'Full-time',
        experienceReq: j.experienceReq || expFilterLabel,
        source: j.source || 'Direct Board',
        sourceUrl: j.sourceUrl || uniqueSourceUrls[idx] || uniqueSourceUrls[0] || 'https://www.indeed.com',
        postedDate: j.postedDate || 'Recently',
        description: j.description || '',
        requiredSkills: Array.isArray(j.requiredSkills) ? j.requiredSkills : [],
        companyDomain: j.companyDomain || '',
        matchScore: typeof j.matchScore === 'number' ? Math.min(100, Math.max(0, Math.round(j.matchScore))) : 85,
        matchReasoning: j.matchReasoning || 'Aligned with target titles and core skills.',
        applyMethod: j.applyMethod || 'company_portal',
        status: 'discovered',
        discoveredAt: new Date().toISOString(),
      }));

      res.json({
        success: true,
        provider: llmConfig.provider,
        model: llmConfig.model,
        jobs: enrichedJobs,
        groundingUrls: uniqueSourceUrls,
        searchStats: {
          passesExecuted,
          rawCandidatesFound: combinedCandidates.length,
          verifiedCount: enrichedJobs.length,
          groundingSourcesCount: uniqueSourceUrls.length,
          durationMs: Date.now() - startedAt,
          auditSummary,
        },
      });
    } catch (error: any) {
      const formatted = formatLlmError(llmConfig.provider, llmConfig.model, error);
      console.warn(`[search-indeed-jobs] (${llmConfig.provider}) ${formatted.status}: ${formatted.message}`);
      res.status(formatted.status).json({ success: false, error: formatted.message });
    }
  });

  // 1d. Calibrated Job Fit Screening via Active Third-Party Provider
  app.post('/api/agent/decision-evaluate-jobs', async (req, res) => {
    const llmConfig = resolveLlmConfig(req);
    try {
      const { job, jobs, userProfile } = req.body || {};

      if (job) {
        const prompt = `
Evaluate candidate fit for this job listing on a 0-100 scale across four rubrics.
CANDIDATE: ${JSON.stringify({
          experienceLevel: userProfile?.experienceLevel || 'entry',
          yearsExperience: userProfile?.yearsExperience || 0,
          skills: userProfile?.skills || [],
          customBio: userProfile?.customBio || '',
        })}
JOB: ${JSON.stringify({
          title: job?.title || '',
          company: job?.company || '',
          location: job?.location || '',
          experienceReq: job?.experienceReq || '',
          requiredSkills: job?.requiredSkills || [],
          description: String(job?.description || '').slice(0, 3000),
        })}

Return strictly valid JSON:
{
  "overallScore": 84,
  "scoreBreakdown": {
    "skillsMatchScore": 85,
    "experienceMatchScore": 80,
    "educationMatchScore": 85,
    "domainKnowledgeScore": 82
  },
  "shouldApplyProbability": 85,
  "confidence": 88,
  "seniorityTrack": "entry"
}`;
        const response = await runLlmGeneration({ llmConfig, prompt, responseKind: 'object' });
        const parsed = extractJsonObject(response.text);
        if (!parsed) {
          return res.status(502).json({ success: false, error: 'Could not calibrate job fit.' });
        }
        return res.json({
          success: true,
          model: response.usedModel,
          overallScore: parsed.overallScore ?? job.matchScore ?? 80,
          scoreBreakdown: parsed.scoreBreakdown,
          decisionCalibration: {
            model: response.usedModel,
            shouldApplyProbability: parsed.shouldApplyProbability ?? parsed.overallScore ?? 80,
            confidence: parsed.confidence ?? 85,
            seniorityTrack: parsed.seniorityTrack || 'entry',
          },
        });
      }

      if (Array.isArray(jobs) && jobs.length > 0) {
        const compactJobs = jobs.slice(0, 12).map((j: any, idx: number) => ({
          index: idx,
          title: j.title,
          company: j.company,
          location: j.location,
          requiredSkills: j.requiredSkills || [],
          description: String(j.description || '').slice(0, 800),
        }));
        const prompt = `
Score each job (0-100) for this candidate and estimate apply fit probability (0-100) and confidence (0-100).
CANDIDATE: ${JSON.stringify({
          experienceLevel: userProfile?.experienceLevel || 'entry',
          yearsExperience: userProfile?.yearsExperience || 0,
          skills: userProfile?.skills || [],
          customBio: userProfile?.customBio || '',
        })}
JOBS:
${JSON.stringify(compactJobs, null, 2)}

Return strictly a valid JSON array matching each index:
[
  { "index": 0, "matchScore": 86, "shouldApplyProbability": 88, "confidence": 85 }
]`;
        const response = await runLlmGeneration({ llmConfig, prompt, responseKind: 'array' });
        const scores = extractJsonArray<{
          index: number;
          matchScore: number;
          shouldApplyProbability?: number;
          confidence?: number;
        }>(response.text);

        const scoreMap = new Map((scores || []).map((s) => [Number(s.index), s]));
        const screenedJobs = jobs.map((j: any, idx: number) => {
          const item = scoreMap.get(idx);
          if (!item) return j;
          const calibratedScore = Math.min(100, Math.max(0, Math.round(Number(item.matchScore) || j.matchScore || 75)));
          return {
            ...j,
            matchScore: calibratedScore,
            decisionCalibration: {
              model: response.usedModel,
              shouldApplyProbability: Math.min(
                100,
                Math.max(0, Math.round(Number(item.shouldApplyProbability) || calibratedScore))
              ),
              confidence: Math.min(100, Math.max(0, Math.round(Number(item.confidence) || 85))),
            },
          };
        });

        return res.json({
          success: true,
          model: response.usedModel,
          jobs: screenedJobs,
        });
      }

      return res.status(400).json({
        success: false,
        error: 'Provide a job object or non-empty jobs array to evaluate.',
      });
    } catch (error: any) {
      const formatted = formatLlmError(llmConfig.provider, llmConfig.model, error);
      console.warn(`[decision-evaluate-jobs] (${llmConfig.provider}) ${formatted.status}: ${formatted.message}`);
      res.status(formatted.status).json({ success: false, error: formatted.message });
    }
  });

  // 1a. Intelligent Keyword & Target Role Suggestions from Candidate CV Data
  app.post('/api/agent/suggest-keywords', async (req, res) => {
    const llmConfig = resolveLlmConfig(req);
    try {
      const { userProfile, currentTitles = [], currentKeywords = [] } = req.body || {};

      const prompt = `
You are an expert Technical Recruiter & Job Search Strategist.
Analyze the candidate's CV, skills, work history, and projects to recommend high-yield job search titles and ATS keywords that will uncover the best real-world job postings on Indeed, LinkedIn, and company ATS boards.

CANDIDATE DATA:
- Experience Level: ${userProfile?.experienceLevel || 'entry'} (${userProfile?.yearsExperience || 0} years)
- Current Bio: ${userProfile?.customBio || ''}
- Existing Skills: ${Array.isArray(userProfile?.skills) ? userProfile.skills.join(', ') : ''}
- Already Active Titles (DO NOT repeat these): ${Array.isArray(currentTitles) ? currentTitles.join(', ') : ''}
- Already Active Keywords (DO NOT repeat these): ${Array.isArray(currentKeywords) ? currentKeywords.join(', ') : ''}
- Work History: ${JSON.stringify(userProfile?.workHistory || [])}
- Projects: ${JSON.stringify(userProfile?.projects || [])}
- Master CV Markdown:
${userProfile?.masterCV || ''}

Instructions:
1. Suggest 4-6 realistic, searchable job titles matching the candidate's true domain and experience level (distinct from active titles).
2. Suggest 8-12 specific, high-signal job-board keywords, tools, workflows, or domain terms extracted or strongly implied by the CV (distinct from active keywords).
3. Provide a concise 1-2 sentence searchStrategyNote explaining how these terms expand high-fit job discovery.

Return strictly a valid JSON object matching this exact shape (no markdown prose):
{
  "suggestedTitles": ["Role Title 1", "Role Title 2"],
  "suggestedKeywords": ["Keyword 1", "Keyword 2"],
  "searchStrategyNote": "Concise 1-2 sentence strategy note."
}`;

      const response = await runLlmGeneration({
        llmConfig,
        prompt,
        responseKind: 'object',
        geminiSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedTitles: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestedKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            searchStrategyNote: { type: Type.STRING },
          },
        },
      });

      const suggestions = extractJsonObject<{
        suggestedTitles?: string[];
        suggestedKeywords?: string[];
        searchStrategyNote?: string;
      }>(response.text);

      if (!suggestions) {
        return res.status(502).json({
          success: false,
          error: 'Could not generate structured keyword suggestions from CV.',
        });
      }

      res.json({
        success: true,
        provider: llmConfig.provider,
        model: response.usedModel,
        suggestions: {
          suggestedTitles: Array.isArray(suggestions.suggestedTitles) ? suggestions.suggestedTitles.slice(0, 6) : [],
          suggestedKeywords: Array.isArray(suggestions.suggestedKeywords)
            ? suggestions.suggestedKeywords.slice(0, 12)
            : [],
          searchStrategyNote:
            suggestions.searchStrategyNote ||
            'Recommended adjacent job titles and high-signal keywords derived from your CV.',
        },
      });
    } catch (error: any) {
      const formatted = formatLlmError(llmConfig.provider, llmConfig.model, error);
      console.warn(`[suggest-keywords] (${llmConfig.provider}) ${formatted.status}: ${formatted.message}`);
      res.status(formatted.status).json({ success: false, error: formatted.message });
    }
  });

  // 1b. Parse Uploaded CV Document (PDF / DOCX / TXT / MD)
  app.post('/api/agent/parse-cv-file', async (req, res) => {
    const llmConfig = resolveLlmConfig(req);
    try {
      const { fileName = 'resume', fileTextContent, fileBase64, mimeType } = req.body || {};
      const lowerName = String(fileName).toLowerCase();

      if (lowerName.endsWith('.doc') && !lowerName.endsWith('.docx')) {
        return res.status(400).json({
          success: false,
          error: 'Legacy .doc binary format is not supported. Please upload a .pdf, .docx, .txt, or .md resume.',
        });
      }

      const jsonExtractionSchemaPrompt = `
You are an expert ATS Resume Parser.
Extract structured candidate profile information from the uploaded resume ("${fileName}").

Return strictly a valid JSON object matching this exact shape (no markdown prose):
{
  "fullName": "Candidate full name",
  "email": "Email address",
  "phone": "Phone number",
  "location": "City/Country or Remote",
  "linkedinUrl": "LinkedIn URL or empty string",
  "githubUrl": "GitHub URL or empty string",
  "portfolioUrl": "Portfolio URL or empty string",
  "skills": ["Skill 1", "Skill 2"],
  "targetJobTitles": ["Target Role 1", "Target Role 2"],
  "experienceLevel": "fresher" | "entry" | "mid" | "senior",
  "yearsExperience": 0,
  "desiredSalary": "Expected compensation or empty string",
  "workAuthorization": "Work authorization status",
  "workHistory": [
    {
      "id": "wrk_1",
      "company": "Company Name",
      "role": "Job Title",
      "duration": "2023 - Present",
      "highlights": ["Achievement 1", "Achievement 2"]
    }
  ],
  "education": [
    {
      "id": "edu_1",
      "institution": "University Name",
      "degree": "Degree Name",
      "year": "2024",
      "fieldOfStudy": "Major / Field"
    }
  ],
  "projects": [
    {
      "id": "prj_1",
      "name": "Project Name",
      "description": "Brief description",
      "techStack": ["Tech 1", "Tech 2"],
      "link": ""
    }
  ],
  "certificationsList": ["Certification 1"],
  "customBio": "2-3 sentence professional summary.",
  "masterCV": "Clean, well-structured Markdown version of the full resume.",
  "coverLetterTemplate": "Reusable cover letter template."
}`;

      let extractedText = fileTextContent || '';

      const cleanBase64 = fileBase64
        ? fileBase64.includes(',')
          ? fileBase64.split(',')[1]
          : fileBase64
        : '';

      // Extract plain text from .docx before sending to LLM
      if (
        cleanBase64 &&
        (lowerName.endsWith('.docx') || String(mimeType || '').includes('wordprocessingml'))
      ) {
        const buffer = Buffer.from(cleanBase64, 'base64');
        const docxResult = await mammoth.extractRawText({ buffer });
        extractedText = docxResult.value || '';
        if (!extractedText.trim()) {
          return res.status(400).json({
            success: false,
            error: 'Could not extract readable text from the uploaded .docx file.',
          });
        }
      } else if (
        !extractedText &&
        cleanBase64 &&
        (lowerName.endsWith('.pdf') || String(mimeType || '').toLowerCase().includes('pdf'))
      ) {
        // Extract plain text from PDF so every third-party model (Groq, DeepSeek, OpenRouter free, etc.) can parse it
        try {
          const { extractText } = await import('unpdf');
          const buffer = Buffer.from(cleanBase64, 'base64');
          const pdfResult = await extractText(new Uint8Array(buffer), { mergePages: true });
          const pdfText = Array.isArray(pdfResult?.text)
            ? pdfResult.text.join('\n')
            : String(pdfResult?.text || '');
          if (pdfText.trim().length > 30) {
            extractedText = pdfText.trim();
          }
        } catch (pdfErr: any) {
          console.warn('[parse-cv-file] unpdf text extraction fallback:', pdfErr?.message || pdfErr);
        }
      }

      const supportsBinaryPdf =
        llmConfig.provider === 'openrouter' ||
        llmConfig.provider === 'openai' ||
        llmConfig.provider === 'anthropic';

      if (!extractedText && cleanBase64 && !supportsBinaryPdf) {
        return res.status(400).json({
          success: false,
          error:
            'Could not extract selectable text from this PDF (it may be a scanned image). Try uploading a text-based PDF, .docx, .txt, or .md resume, or use OpenRouter / OpenAI / Claude.',
        });
      }

      const useAttachment = !extractedText && Boolean(cleanBase64) && Boolean(mimeType);
      const prompt = useAttachment
        ? jsonExtractionSchemaPrompt
        : `${jsonExtractionSchemaPrompt}\n\n=== RESUME CONTENT START ===\n${extractedText}\n=== RESUME CONTENT END ===`;

      const response = await runLlmGeneration({
        llmConfig,
        prompt,
        responseKind: 'object',
        fileAttachment: useAttachment
          ? {
              fileName,
              mimeType: String(mimeType),
              base64: cleanBase64,
            }
          : undefined,
      });

      const parsedProfile = extractJsonObject(response.text);
      if (!parsedProfile) {
        return res.status(502).json({
          success: false,
          error: 'Failed to extract structured profile JSON from the uploaded CV.',
        });
      }

      res.json({
        success: true,
        provider: llmConfig.provider,
        model: response.usedModel,
        fileName,
        parsedProfile,
      });
    } catch (error: any) {
      const formatted = formatLlmError(llmConfig.provider, llmConfig.model, error);
      console.warn(`[parse-cv-file] (${llmConfig.provider}) ${formatted.status}: ${formatted.message}`);
      res.status(formatted.status).json({ success: false, error: formatted.message });
    }
  });

  // 1c. Deep Job Description Parsing & ATS Compatibility Audit
  app.post('/api/agent/analyze-job-compatibility', async (req, res) => {
    const llmConfig = resolveLlmConfig(req);
    try {
      const { job, userProfile } = req.body || {};

      const prompt = `
You are an expert ATS (Applicant Tracking System) Auditor & Technical Recruiter.
Compare this Job Listing against the Candidate Profile and return a structured compatibility audit.

=== JOB LISTING ===
Title: ${job?.title || ''}
Company: ${job?.company || ''}
Experience Req: ${job?.experienceReq || 'Not specified'}
Description:
${job?.description || ''}
Required Skills: ${Array.isArray(job?.requiredSkills) ? job.requiredSkills.join(', ') : ''}

=== CANDIDATE PROFILE ===
Name: ${userProfile?.fullName || ''}
Experience Level: ${userProfile?.experienceLevel || 'entry'} (${userProfile?.yearsExperience || 0} yrs)
Skills: ${Array.isArray(userProfile?.skills) ? userProfile.skills.join(', ') : ''}
Summary: ${userProfile?.customBio || ''}
Master CV:
${userProfile?.masterCV || ''}

Return strictly a valid JSON object matching this exact shape (no markdown prose):
{
  "overallScore": 85,
  "scoreBreakdown": {
    "skillsMatchScore": 88,
    "experienceMatchScore": 82,
    "educationMatchScore": 90,
    "domainKnowledgeScore": 80
  },
  "matchedKeywords": ["Matched skill 1", "Matched skill 2"],
  "missingKeywords": ["Missing skill 1"],
  "matchedRequirements": ["Matched requirement 1"],
  "missingRequirements": ["Missing requirement 1"],
  "strengths": ["Candidate strength 1"],
  "gapRecommendations": ["Specific CV tailoring recommendation 1"]
}`;

      const response = await runLlmGeneration({
        llmConfig,
        prompt,
        responseKind: 'object',
      });

      const analysis = extractJsonObject(response.text);
      if (!analysis) {
        return res.status(502).json({
          success: false,
          error: 'Could not parse ATS compatibility analysis.',
        });
      }

      analysis.jobId = job?.id;

      res.json({
        success: true,
        provider: llmConfig.provider,
        model: response.usedModel,
        analysis,
      });
    } catch (error: any) {
      const formatted = formatLlmError(llmConfig.provider, llmConfig.model, error);
      console.warn(`[analyze-job-compatibility] (${llmConfig.provider}) ${formatted.status}: ${formatted.message}`);
      res.status(formatted.status).json({ success: false, error: formatted.message });
    }
  });

  // 2. Discover Company Website & Career Page
  app.post('/api/agent/find-company-careers', async (req, res) => {
    const llmConfig = resolveLlmConfig(req);
    try {
      const { companyName, jobTitle } = req.body || {};

      const discoveryPrompt = `
Find the official company website domain, dedicated career page URL, and likely ATS platform for:
Company: "${companyName}"
Job Title: "${jobTitle}"

Return strictly a valid JSON object (no markdown prose):
{
  "companyDomain": "company.com",
  "careerPageUrl": "https://company.com/careers",
  "atsPlatform": "Lever | Greenhouse | Workday | Ashby | Custom Portal",
  "applyType": "direct_ats",
  "notes": "Brief note about the discovered official career portal."
}`;

      const hasNativeSearch =
        (llmConfig.provider === 'openai' || llmConfig.provider === 'anthropic') ||
        (llmConfig.provider === 'openrouter' &&
          llmConfig.model !== 'openrouter/free' &&
          !llmConfig.model.endsWith(':free'));

      let parsed: any = null;
      try {
        const response = await runLlmGeneration({
          llmConfig,
          prompt: discoveryPrompt,
          responseKind: 'object',
          useWebSearch: hasNativeSearch,
          allowGeminiFallback: false,
        });
        parsed = extractJsonObject(response.text);
      } catch (searchErr: any) {
        const shouldFallbackToStandard =
          searchErr instanceof LlmHttpError &&
          (searchErr.status === 400 || searchErr.status === 402 || searchErr.status === 403);

        if (shouldFallbackToStandard) {
          const fallbackResp = await runLlmGeneration({
            llmConfig,
            prompt: discoveryPrompt,
            responseKind: 'object',
            useWebSearch: false,
          });
          parsed = extractJsonObject(fallbackResp.text);
        } else {
          throw searchErr;
        }
      }

      const fallbackSlug = String(companyName || 'company').toLowerCase().replace(/[^a-z0-9]/g, '');
      const companyDetails = {
        companyDomain: parsed?.companyDomain || `${fallbackSlug}.com`,
        careerPageUrl: parsed?.careerPageUrl || `https://${fallbackSlug}.com/careers`,
        atsPlatform: parsed?.atsPlatform || 'Custom Career Portal',
        applyType: parsed?.applyType || 'direct_ats',
        notes: parsed?.notes || `Resolved career portal reference for ${companyName}.`,
      };

      res.json({ success: true, provider: llmConfig.provider, companyDetails });
    } catch (error: any) {
      const formatted = formatLlmError(llmConfig.provider, llmConfig.model, error);
      res.status(formatted.status).json({ success: false, error: formatted.message });
    }
  });

  // 3. Tailor Resume & Cover Letter
  app.post('/api/agent/tailor-resume', async (req, res) => {
    const llmConfig = resolveLlmConfig(req);
    try {
      const { userProfile, jobListing } = req.body || {};

      const tailoringPrompt = `
You are an expert ATS Resume Writer & Career Coach.
Customize the candidate's Master CV and write a concise, tailored cover letter for the target job.
IMPORTANT: Only highlight and re-order real skills/experiences present in the candidate profile—never fabricate degrees, employers, or metrics.

CANDIDATE:
Name: ${userProfile?.fullName || 'Candidate'}
Skills: ${Array.isArray(userProfile?.skills) ? userProfile.skills.join(', ') : ''}
Base CV:
${userProfile?.masterCV || ''}

TARGET JOB:
Title: ${jobListing?.title || ''}
Company: ${jobListing?.company || ''}
Description: ${jobListing?.description || ''}

Return strictly a valid JSON object matching this exact shape (no markdown prose):
{
  "tailoredCV": "Full tailored Markdown resume string",
  "tailoredCoverLetter": "Concise, tailored cover letter text",
  "matchScore": 88,
  "matchedKeywords": ["Skill 1", "Skill 2"],
  "summaryReasoning": "Concise explanation of tailored changes"
}`;

      const response = await runLlmGeneration({
        llmConfig,
        prompt: tailoringPrompt,
        responseKind: 'object',
        geminiSchema: {
          type: Type.OBJECT,
          properties: {
            tailoredCV: { type: Type.STRING },
            tailoredCoverLetter: { type: Type.STRING },
            matchScore: { type: Type.NUMBER },
            matchedKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            summaryReasoning: { type: Type.STRING },
          },
        },
      });

      const result = extractJsonObject(response.text);
      if (!result) {
        return res.status(502).json({
          success: false,
          error: 'Could not generate tailored resume output.',
        });
      }

      res.json({ success: true, provider: llmConfig.provider, model: response.usedModel, result });
    } catch (error: any) {
      const formatted = formatLlmError(llmConfig.provider, llmConfig.model, error);
      console.warn(`[tailor-resume] (${llmConfig.provider}) ${formatted.status}: ${formatted.message}`);
      res.status(formatted.status).json({ success: false, error: formatted.message });
    }
  });

  // 4. Map ATS Form Fields
  app.post('/api/agent/map-form-fields', async (req, res) => {
    const llmConfig = resolveLlmConfig(req);
    try {
      const { userProfile, jobListing } = req.body || {};

      const formPrompt = `
Generate a realistic ATS application form mapping array for a candidate applying to ${jobListing?.company || 'the company'} for the role "${jobListing?.title || 'Open Position'}".

CANDIDATE DETAILS:
- Full Name: ${userProfile?.fullName || ''}
- Email: ${userProfile?.email || ''}
- Phone: ${userProfile?.phone || ''}
- Location: ${userProfile?.location || ''}
- LinkedIn: ${userProfile?.linkedinUrl || ''}
- GitHub: ${userProfile?.githubUrl || ''}
- Work Authorization: ${userProfile?.workAuthorization || ''}
- Desired Salary: ${userProfile?.desiredSalary || ''}
- Notice Period: ${userProfile?.noticePeriod || ''}

Return strictly a valid JSON array of form field objects matching this exact shape (no markdown prose):
[
  {
    "fieldLabel": "Full Name",
    "fieldType": "text | email | phone | dropdown | radio | textarea | file_upload",
    "fieldName": "fullName",
    "valueToFill": "Candidate detail value",
    "explanation": "Brief mapping explanation"
  }
]`;

      const response = await runLlmGeneration({
        llmConfig,
        prompt: formPrompt,
        responseKind: 'array',
        geminiSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              fieldLabel: { type: Type.STRING },
              fieldType: { type: Type.STRING },
              fieldName: { type: Type.STRING },
              valueToFill: { type: Type.STRING },
              explanation: { type: Type.STRING },
            },
          },
        },
      });

      const formFields = extractJsonArray(response.text);
      if (!formFields) {
        return res.status(502).json({
          success: false,
          error: 'Could not parse ATS form field mappings.',
        });
      }

      res.json({ success: true, provider: llmConfig.provider, model: response.usedModel, formFields });
    } catch (error: any) {
      const formatted = formatLlmError(llmConfig.provider, llmConfig.model, error);
      console.warn(`[map-form-fields] (${llmConfig.provider}) ${formatted.status}: ${formatted.message}`);
      res.status(formatted.status).json({ success: false, error: formatted.message });
    }
  });

  // Setup Vite Development Middleware vs Production Static Serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AutoApply AI Server running at http://localhost:${PORT}`);
  });
}

startServer();
