import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import mammoth from 'mammoth';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const FALLBACK_MODEL = 'gemini-4-hydrogen';
const DECISION_MODEL = 'gemini-decision-1';

type LlmProviderId = 'gemini' | 'openrouter' | 'openai' | 'anthropic';

interface LlmConfig {
  provider: LlmProviderId;
  model: string;
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

const VALID_PROVIDERS: LlmProviderId[] = ['gemini', 'openrouter', 'openai', 'anthropic'];

const PROVIDER_ENV_META: Record<
  LlmProviderId,
  { envKey: string; label: string; defaultModel: string }
> = {
  gemini: {
    envKey: 'GEMINI_API_KEY',
    label: 'Google Gemini',
    defaultModel: DEFAULT_MODEL,
  },
  openrouter: {
    envKey: 'OPENROUTER_API_KEY',
    label: 'OpenRouter',
    defaultModel: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
  },
  openai: {
    envKey: 'OPENAI_API_KEY',
    label: 'OpenAI',
    defaultModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  },
  anthropic: {
    envKey: 'ANTHROPIC_API_KEY',
    label: 'Claude (Anthropic)',
    defaultModel: process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest',
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

function getProviderApiKey(provider: LlmProviderId): string | null {
  switch (provider) {
    case 'gemini':
      return cleanEnvKey(process.env.GEMINI_API_KEY, ['YOUR_GEMINI_API_KEY', 'MY_GEMINI_API_KEY']);
    case 'openrouter':
      return cleanEnvKey(process.env.OPENROUTER_API_KEY, ['YOUR_OPENROUTER_API_KEY']);
    case 'openai':
      return cleanEnvKey(process.env.OPENAI_API_KEY, ['YOUR_OPENAI_API_KEY']);
    case 'anthropic':
      return cleanEnvKey(process.env.ANTHROPIC_API_KEY, ['YOUR_ANTHROPIC_API_KEY']);
  }
}

function requireProviderApiKey(provider: LlmProviderId): string {
  const key = getProviderApiKey(provider);
  if (!key) {
    const meta = PROVIDER_ENV_META[provider];
    throw new LlmHttpError(
      503,
      `${meta.envKey} is not configured. Add ${meta.envKey} in Settings > Secrets (or in your local .env file) to use ${meta.label}.`
    );
  }
  return key;
}

function resolveLlmConfig(rawConfig?: any): LlmConfig {
  const envDefaultProvider = String(process.env.AI_PROVIDER || '').toLowerCase() as LlmProviderId;
  const requestedProvider = String(rawConfig?.provider || '').toLowerCase() as LlmProviderId;

  const provider: LlmProviderId = VALID_PROVIDERS.includes(requestedProvider)
    ? requestedProvider
    : VALID_PROVIDERS.includes(envDefaultProvider)
      ? envDefaultProvider
      : 'gemini';

  const requestedModel = typeof rawConfig?.model === 'string' ? rawConfig.model.trim() : '';
  const model = requestedModel || PROVIDER_ENV_META[provider].defaultModel;

  return { provider, model };
}

function extractJsonObject<T = any>(rawText: string): T | null {
  if (!rawText) return null;
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

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
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

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
  const apiKey = requireProviderApiKey('openrouter');
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

  const plugins: any[] = [];
  if (useWebSearch) {
    plugins.push({ id: 'web', max_results: 8 });
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

  const resp = await callWithRetry(async () => {
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
      throw formatUpstreamProviderHttpError('openrouter', llmConfig.model, r.status, errText);
    }
    return r.json();
  });

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

async function callOpenAI(opts: LlmGenerationOptions): Promise<LlmGenerationResult> {
  const apiKey = requireProviderApiKey('openai');
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
  }

  // Standard OpenAI Chat Completions
  const messages: any[] = [];
  if (sysText) messages.push({ role: 'system', content: sysText });
  messages.push({ role: 'user', content: prompt });

  const executeChat = async (includeJsonFormat: boolean) => {
    const body: any = {
      model: llmConfig.model,
      messages,
    };
    if (includeJsonFormat && responseKind === 'object') {
      body.response_format = { type: 'json_object' };
    }

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const errText = await r.text();
      if (includeJsonFormat && r.status === 400 && errText.toLowerCase().includes('response_format')) {
        return executeChat(false);
      }
      throw formatUpstreamProviderHttpError('openai', llmConfig.model, r.status, errText);
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

async function callAnthropic(opts: LlmGenerationOptions): Promise<LlmGenerationResult> {
  const apiKey = requireProviderApiKey('anthropic');
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

  const body: any = {
    model: llmConfig.model,
    max_tokens: 4096,
    messages: [{ role: 'user', content: contentParts }],
  };
  if (sysText) body.system = sysText;
  if (useWebSearch) {
    body.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }];
  }

  const resp = await callWithRetry(async () => {
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
      throw formatUpstreamProviderHttpError('anthropic', llmConfig.model, r.status, errText);
    }
    return r.json();
  });

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

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

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

    // Default: Google Gemini via @google/genai SDK
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

  // API Health Check (read-only boolean provider availability — never returns secrets)
  app.get('/api/health', (_req, res) => {
    const providers: Record<LlmProviderId, boolean> = {
      gemini: Boolean(getProviderApiKey('gemini')),
      openrouter: Boolean(getProviderApiKey('openrouter')),
      openai: Boolean(getProviderApiKey('openai')),
      anthropic: Boolean(getProviderApiKey('anthropic')),
    };

    res.json({
      status: 'ok',
      service: 'AutoApply AI Agent Server',
      aiConfigured: providers.gemini || providers.openrouter || providers.openai || providers.anthropic,
      providers,
      model: DEFAULT_MODEL,
      decisionModel: DECISION_MODEL,
      timestamp: new Date().toISOString(),
    });
  });

  // 1. Multi-Pass Job Search (3 Passes: Job Boards Grounding -> Direct ATS Grounding -> Deduplication & Verification)
  app.post('/api/agent/search-indeed-jobs', async (req, res) => {
    const startedAt = Date.now();
    const llmConfig = resolveLlmConfig(req.body?.llmConfig);
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
      requireProviderApiKey(llmConfig.provider);

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
Return strictly a valid JSON array of up to 5 distinct job listings (no markdown prose outside JSON):
[
  {
    "title": "Exact job title",
    "company": "Company name",
    "location": "Location e.g. Remote (Worldwide)",
    "salary": "Salary range or Competitive",
    "jobType": "Full-time Remote",
    "experienceReq": "Entry Level / 0-2 Yrs",
    "source": "Indeed | LinkedIn | Glassdoor | Company Careers",
    "sourceUrl": "Direct URL to listing from grounded results",
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

      let passesExecuted = 0;
      let pass1Jobs: any[] = [];
      let pass2Jobs: any[] = [];
      const collectedUrls: string[] = [];

      // PASS 1: Major Job Boards Grounded Search
      const pass1Prompt = `
You are Pass 1 of a multi-stage AI Job Hunting Agent.
Use live web search specifically across major job boards (Indeed, LinkedIn Jobs, Glassdoor, WeWorkRemotely, RemoteOK, Wellfound) to discover active job postings matching these parameters:
${sharedFiltersBlock}
${itemSchemaDescription}`;

      const pass1Resp = await runLlmGeneration({
        llmConfig,
        prompt: pass1Prompt,
        responseKind: 'array',
        useWebSearch: true,
        allowGeminiFallback: false,
      });
      passesExecuted += 1;
      collectedUrls.push(...pass1Resp.groundingUrls);
      pass1Jobs = extractJsonArray(pass1Resp.text) || [];

      // PASS 2: Direct ATS & Company Career Portals Grounded Search
      try {
        const pass2Prompt = `
You are Pass 2 of a multi-stage AI Job Hunting Agent focusing on DIRECT COMPANY CAREER PORTALS & ATS BOARDS.
Use live web search targeting Greenhouse (boards.greenhouse.io), Lever (jobs.lever.co), Ashby (jobs.ashbyhq.com), Workable, and official company /careers pages—avoiding duplicate listings already generic to aggregators.
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

      const uniqueSourceUrls = Array.from(new Set(collectedUrls));
      const combinedCandidates = [...pass1Jobs, ...pass2Jobs];

      if (combinedCandidates.length === 0) {
        return res.status(502).json({
          success: false,
          error:
            'Could not find structured job listings across search passes. Try broadening your titles, keywords, or date window.',
        });
      }

      // PASS 3: Consolidation, Deduplication, Strict Filter Audit & Fit Scoring
      let finalVerifiedJobs: any[] = combinedCandidates;
      let auditSummary = `Consolidated ${combinedCandidates.length} candidates across ${passesExecuted} grounded search passes (${llmConfig.provider}:${llmConfig.model}).`;

      try {
        const pass3Prompt = `
You are Pass 3 (Verification & Deduplication Auditor) of a 3-stage Job Search Agent.
Review the combined job candidates collected from Pass 1 (Job Boards) and Pass 2 (Direct ATS Portals), plus the verified grounding URLs.

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
4. ${locationType === 'remote_only' ? 'Remove strictly onsite or US-only locked roles that conflict with Remote/Worldwide.' : 'Keep location-aligned roles.'}
5. Prefer verified grounding URLs where matching; preserve realistic source names and clean 2-paragraph descriptions.
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
      "source": "Indeed | LinkedIn | Glassdoor | Company Careers",
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
          geminiSchema: {
            type: Type.OBJECT,
            properties: {
              auditSummary: { type: Type.STRING },
              verifiedJobs: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    company: { type: Type.STRING },
                    location: { type: Type.STRING },
                    salary: { type: Type.STRING },
                    jobType: { type: Type.STRING },
                    experienceReq: { type: Type.STRING },
                    source: { type: Type.STRING },
                    sourceUrl: { type: Type.STRING },
                    postedDate: { type: Type.STRING },
                    description: { type: Type.STRING },
                    requiredSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
                    companyDomain: { type: Type.STRING },
                    matchScore: { type: Type.NUMBER },
                    matchReasoning: { type: Type.STRING },
                    applyMethod: { type: Type.STRING },
                  },
                },
              },
            },
          },
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

      let enrichedJobs = finalVerifiedJobs.slice(0, 8).map((j: any, idx: number) => ({
        id: `job_search_${Date.now()}_${idx}`,
        title: j.title || 'Open Role',
        company: j.company || 'Company',
        location: j.location || 'Remote',
        salary: j.salary || 'Competitive',
        jobType: j.jobType || 'Full-time',
        experienceReq: j.experienceReq || expFilterLabel,
        source: j.source || 'Indeed',
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

      // Calibrate match scores & compliance flags with gemini-decision-1 (0 output tokens) when Gemini key is available
      if (getProviderApiKey('gemini') && enrichedJobs.length > 0) {
        try {
          enrichedJobs = await batchScreenJobsWithDecisionModel(enrichedJobs, {
            fullName: 'Candidate',
            experienceLevel,
            skills: keywords,
            customBio: userProfileSummary,
          });
          enrichedJobs.sort((a: any, b: any) =>
            sortBy === 'date' ? 0 : (b.matchScore || 0) - (a.matchScore || 0)
          );
          auditSummary = `${auditSummary} Calibrated with ${DECISION_MODEL}.`;
        } catch (decisionErr: any) {
          console.warn(`[search-indeed-jobs] Decision model enrichment skipped: ${decisionErr?.message || decisionErr}`);
        }
      }

      res.json({
        success: true,
        provider: llmConfig.provider,
        model: llmConfig.model,
        decisionModel: getProviderApiKey('gemini') ? DECISION_MODEL : null,
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

  // 1d. Calibrated Job Pre-Screening via Google Decisions API (gemini-decision-1, 0 output tokens)
  app.post('/api/agent/decision-evaluate-jobs', async (req, res) => {
    try {
      const { job, jobs, userProfile } = req.body || {};

      if (job) {
        const evalResult = await evaluateJobWithDecisionModel(job, userProfile);
        return res.json({
          success: true,
          model: DECISION_MODEL,
          ...evalResult,
        });
      }

      if (Array.isArray(jobs) && jobs.length > 0) {
        const screenedJobs = await batchScreenJobsWithDecisionModel(jobs, userProfile);
        return res.json({
          success: true,
          model: DECISION_MODEL,
          jobs: screenedJobs,
        });
      }

      return res.status(400).json({
        success: false,
        error: 'Provide a job object or non-empty jobs array to evaluate.',
      });
    } catch (error: any) {
      const formatted = formatLlmError('gemini', DECISION_MODEL, error);
      console.warn(`[decision-evaluate-jobs] ${formatted.status}: ${formatted.message}`);
      res.status(formatted.status).json({ success: false, error: formatted.message });
    }
  });

  // 1a. Intelligent Keyword & Target Role Suggestions from Candidate CV Data
  app.post('/api/agent/suggest-keywords', async (req, res) => {
    const llmConfig = resolveLlmConfig(req.body?.llmConfig);
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
    const llmConfig = resolveLlmConfig(req.body?.llmConfig);
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

      // Extract plain text from .docx before sending to LLM
      if (
        fileBase64 &&
        (lowerName.endsWith('.docx') || String(mimeType || '').includes('wordprocessingml'))
      ) {
        const cleanBase64 = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;
        const buffer = Buffer.from(cleanBase64, 'base64');
        const docxResult = await mammoth.extractRawText({ buffer });
        extractedText = docxResult.value || '';
        if (!extractedText.trim()) {
          return res.status(400).json({
            success: false,
            error: 'Could not extract readable text from the uploaded .docx file.',
          });
        }
      }

      const cleanBase64 = fileBase64
        ? fileBase64.includes(',')
          ? fileBase64.split(',')[1]
          : fileBase64
        : '';

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
    const llmConfig = resolveLlmConfig(req.body?.llmConfig);
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

      const llmPromise = runLlmGeneration({
        llmConfig,
        prompt,
        responseKind: 'object',
        geminiSchema: {
          type: Type.OBJECT,
          properties: {
            matchedKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            matchedRequirements: { type: Type.ARRAY, items: { type: Type.STRING } },
            missingRequirements: { type: Type.ARRAY, items: { type: Type.STRING } },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            gapRecommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        },
      });

      const decisionPromise = getProviderApiKey('gemini')
        ? evaluateJobWithDecisionModel(job, userProfile).catch((err) => {
            console.warn('[analyze-job-compatibility] Decision model calibration skipped:', err?.message || err);
            return null;
          })
        : Promise.resolve(null);

      const [response, decisionEval] = await Promise.all([llmPromise, decisionPromise]);

      const analysis = extractJsonObject(response.text);
      if (!analysis) {
        return res.status(502).json({
          success: false,
          error: 'Could not parse ATS compatibility analysis.',
        });
      }

      if (decisionEval) {
        analysis.overallScore = decisionEval.overallScore;
        analysis.scoreBreakdown = decisionEval.scoreBreakdown;
        analysis.decisionCalibration = decisionEval.decisionCalibration;
      }

      analysis.jobId = job?.id;

      res.json({
        success: true,
        provider: llmConfig.provider,
        model: response.usedModel,
        decisionModel: decisionEval ? DECISION_MODEL : null,
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
    const llmConfig = resolveLlmConfig(req.body?.llmConfig);
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

      const geminiSchema = {
        type: Type.OBJECT,
        properties: {
          companyDomain: { type: Type.STRING },
          careerPageUrl: { type: Type.STRING },
          atsPlatform: { type: Type.STRING },
          applyType: { type: Type.STRING },
          notes: { type: Type.STRING },
        },
      };

      let parsed: any = null;
      try {
        const response = await runLlmGeneration({
          llmConfig,
          prompt: discoveryPrompt,
          responseKind: 'object',
          useWebSearch: true,
          allowGeminiFallback: false,
        });
        parsed = extractJsonObject(response.text);
      } catch (searchErr: any) {
        // Fallback to standard inference if web search quota is exhausted on Gemini or unsupported tool error
        const shouldFallbackToStandard =
          (llmConfig.provider === 'gemini' && isQuotaExhaustedError(searchErr)) ||
          (searchErr instanceof LlmHttpError && searchErr.status === 400);

        if (shouldFallbackToStandard) {
          const fallbackResp = await runLlmGeneration({
            llmConfig,
            prompt: discoveryPrompt,
            responseKind: 'object',
            geminiSchema,
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
    const llmConfig = resolveLlmConfig(req.body?.llmConfig);
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
    const llmConfig = resolveLlmConfig(req.body?.llmConfig);
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
