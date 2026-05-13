import { AIProvider, AIProviderConfig } from './provider';
import { OpenAICompatibleProvider } from './openai-compatible';

const PROVIDER_BASE_URLS: Record<string, string> = {
  opencode_go: 'https://opencode.ai/zen/go/v1',
  openai: 'https://api.openai.com/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  groq: 'https://api.groq.com/openai/v1',
};

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  opencode_go: 'OpenCode Go',
  openai: 'OpenAI',
  openrouter: 'OpenRouter',
  groq: 'Groq',
  custom: 'Custom',
};

const DEFAULT_MODELS: Record<string, string> = {
  opencode_go: 'deepseek-v4-pro',
  openai: 'gpt-4o',
  openrouter: 'meta-llama/llama-3.1-70b-instruct',
  groq: 'llama3-70b-8192',
};

function loadConfig(): AIProviderConfig & { providerName: string } {
  const provider = (process.env.LLM_PROVIDER || 'opencode_go').toLowerCase().trim();
  const apiKey = process.env.LLM_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY || '';
  const baseUrl =
    process.env.LLM_BASE_URL ||
    PROVIDER_BASE_URLS[provider] ||
    process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ||
    '';
  const model = process.env.LLM_MODEL || DEFAULT_MODELS[provider] || 'deepseek-v4-pro';
  const fallbacks = process.env.LLM_MODEL_FALLBACKS
    ? process.env.LLM_MODEL_FALLBACKS.split(',').map((m) => m.trim()).filter(Boolean)
    : [];
  const timeoutMs = parseInt(process.env.LLM_TIMEOUT_MS || '30000', 10);
  const maxTokens = parseInt(process.env.LLM_MAX_TOKENS || '4096', 10);

  if (!apiKey) {
    throw new Error(
      'LLM_API_KEY is not set. Set LLM_API_KEY or AI_INTEGRATIONS_OPENAI_API_KEY environment variable.',
    );
  }

  if (!baseUrl) {
    throw new Error(
      `LLM_BASE_URL is not set for provider "${provider}". Set LLM_BASE_URL or use a known provider name (opencode_go, openai, openrouter, groq).`,
    );
  }

  return {
    providerName: PROVIDER_DISPLAY_NAMES[provider] || provider,
    apiKey,
    baseUrl,
    model,
    fallbacks,
    timeoutMs,
    maxTokens,
  };
}

let cachedProvider: AIProvider & { providerName: string } | null = null;

export function getAIProvider(): AIProvider & { providerName: string } {
  if (!cachedProvider) {
    const config = loadConfig();
    const provider = new OpenAICompatibleProvider(config, config.providerName);
    cachedProvider = Object.assign(provider, { providerName: config.providerName });
  }
  return cachedProvider;
}

export function resetAIProvider(): void {
  cachedProvider = null;
}
