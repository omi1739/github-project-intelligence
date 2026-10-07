import type { AiSettings, AnalysisReport, ProviderId } from '../models/types';
import { redactSecrets } from '../utils/redact';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const AI_SUGGESTIONS = [
  'Explain this repository to me.',
  'Explain this project like I am a beginner.',
  'How does authentication work here?',
  'Where is the database connected?',
  'What should I learn first?',
  'Find potential problems in this project.',
] as const;

interface ProviderDefinition {
  id: ProviderId;
  label: string;
  defaultBaseUrl: string;
  defaultModel: string;
}

export const PROVIDERS: Record<ProviderId, ProviderDefinition> = {
  openai: {
    id: 'openai',
    label: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
  },
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic',
    defaultBaseUrl: 'https://api.anthropic.com',
    defaultModel: 'claude-sonnet-4-5',
  },
  ollama: {
    id: 'ollama',
    label: 'Ollama (local)',
    defaultBaseUrl: 'http://localhost:11434',
    defaultModel: 'llama3.2',
  },
  custom: {
    id: 'custom',
    label: 'OpenAI-compatible endpoint',
    defaultBaseUrl: '',
    defaultModel: '',
  },
};

export class AiError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'AiError';
  }
}

function resolve(settings: AiSettings): {
  url: string;
  headers: Record<string, string>;
  model: string;
} {
  const provider = PROVIDERS[settings.provider];
  const baseUrl = (settings.baseUrl || provider.defaultBaseUrl).replace(/\/$/, '');
  const model = settings.model || provider.defaultModel;

  if (settings.provider === 'anthropic') {
    return {
      url: `${baseUrl}/v1/messages`,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.apiKey,
        'anthropic-version': '2023-06-01',
      },
      model,
    };
  }

  if (settings.provider === 'ollama') {
    return { url: `${baseUrl}/api/chat`, headers: { 'Content-Type': 'application/json' }, model };
  }

  return {
    url: `${baseUrl}/chat/completions`,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    model,
  };
}

function toBody(settings: AiSettings, model: string, messages: ChatMessage[]): unknown {
  if (settings.provider === 'anthropic') {
    const system = messages.find((message) => message.role === 'system')?.content;
    return {
      model,
      max_tokens: 1500,
      system,
      messages: messages.filter((message) => message.role !== 'system'),
    };
  }
  if (settings.provider === 'ollama') {
    return { model, messages, stream: false };
  }
  return { model, messages };
}

function extractText(settings: AiSettings, payload: unknown): string {
  const data = payload as Record<string, unknown>;
  if (settings.provider === 'anthropic') {
    const content = data.content as { text?: string }[] | undefined;
    return content?.map((block) => block.text ?? '').join('') ?? '';
  }
  if (settings.provider === 'ollama') {
    return (data.message as { content?: string } | undefined)?.content ?? '';
  }
  const choices = data.choices as { message?: { content?: string } }[] | undefined;
  return choices?.[0]?.message?.content ?? '';
}

export async function chat(settings: AiSettings, messages: ChatMessage[]): Promise<string> {
  if (!settings.enabled) throw new AiError('AI features are disabled. Enable them in Options.');
  if (settings.provider !== 'ollama' && !settings.apiKey) {
    throw new AiError('No API key configured. Add one in Options.');
  }
  if (!settings.baseUrl && settings.provider === 'custom') {
    throw new AiError('No base URL configured for the custom provider.');
  }

  const { url, headers, model } = resolve(settings);
  const safeMessages = messages.map((message) => ({
    ...message,
    content: redactSecrets(message.content),
  }));

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(toBody(settings, model, safeMessages)),
    });
  } catch (error) {
    throw new AiError(
      `Could not reach ${PROVIDERS[settings.provider].label}. Check the base URL and CORS/permissions.`,
      error,
    );
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new AiError(
      `${PROVIDERS[settings.provider].label} responded with ${response.status}. ${detail.slice(0, 200)}`,
    );
  }

  const text = extractText(settings, await response.json());
  if (!text) throw new AiError('The AI provider returned an empty response.');
  return text;
}

export function reportDigest(report: AnalysisReport): string {
  const digest = {
    repository: report.repo.fullName,
    description: report.repo.description,
    overview: report.overview,
    technologyStack: {
      frontend: report.stack.frontend.map((entry) => entry.name),
      backend: report.stack.backend.map((entry) => entry.name),
      database: report.stack.database.map((entry) => entry.name),
      authentication: report.stack.authentication.map((entry) => entry.name),
      testing: report.stack.testing.map((entry) => entry.name),
      tooling: report.stack.tooling.map((entry) => entry.name),
      deployment: report.stack.deployment.map((entry) => entry.name),
    },
    architecture: report.structure.architecture,
    structureGroups: report.structure.groups,
    importantFiles: report.structure.importantFiles,
    health: report.health,
    activity: report.activity,
    testing: report.testing,
    securityChecks: report.security.checks,
    readmeSummary: report.readme.summary,
  };
  return redactSecrets(JSON.stringify(digest, null, 2));
}

export async function askAboutRepository(
  settings: AiSettings,
  report: AnalysisReport,
  question: string,
): Promise<string> {
  const system: ChatMessage = {
    role: 'system',
    content:
      'You are GitHub Project Intelligence, a senior engineer explaining a repository to another developer. ' +
      'Answer using only the analysis report provided. When something is inferred rather than certain, say so. ' +
      'Keep answers concrete and reference file paths from the report.',
  };
  const contextMessage: ChatMessage = {
    role: 'user',
    content: `Analysis report:\n${reportDigest(report)}`,
  };
  const questionMessage: ChatMessage = {
    role: 'user',
    content: `Question: ${redactSecrets(question)}`,
  };

  return chat(settings, [system, contextMessage, questionMessage]);
}
