import OpenAI from 'openai';
import {
  AIProvider,
  AIProviderConfig,
  ChatMessage,
  ChatOptions,
  AIProviderError,
} from './provider';

export class OpenAICompatibleProvider implements AIProvider {
  readonly name: string;
  readonly baseUrl: string;
  readonly defaultModel: string;
  private readonly fallbacks: string[];
  private readonly timeoutMs: number;
  private readonly maxTokens: number;
  private client: OpenAI;

  constructor(config: AIProviderConfig, providerName = 'openai-compatible') {
    this.name = providerName;
    this.baseUrl = config.baseUrl;
    this.defaultModel = config.model;
    this.fallbacks = config.fallbacks;
    this.timeoutMs = config.timeoutMs;
    this.maxTokens = config.maxTokens;

    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
  }

  async *chat(
    messages: ChatMessage[],
    options?: ChatOptions,
  ): AsyncIterable<string> {
    const model = options?.model ?? this.defaultModel;
    const maxTokens = options?.maxTokens ?? this.maxTokens;
    const modelsToTry = [model, ...this.fallbacks];
    const errors: Error[] = [];

    for (const modelToTry of modelsToTry) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        const stream = await this.client.chat.completions.create({
          model: modelToTry,
          messages: messages as any,
          stream: true,
          max_completion_tokens: maxTokens,
        }, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            yield delta;
          }
        }

        return;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));

        if (error.name === 'AbortError') {
          errors.push(
            new AIProviderError(
              `Request timed out after ${this.timeoutMs}ms`,
              'timeout',
              error,
            ),
          );
        } else if (this.isAuthError(error)) {
          errors.push(
            new AIProviderError(
              `Authentication failed for model ${modelToTry}: ${error.message}`,
              'auth',
              error,
            ),
          );
        } else if (this.isRateLimitError(error)) {
          errors.push(
            new AIProviderError(
              `Rate limited on model ${modelToTry}: ${error.message}`,
              'rate_limit',
              error,
            ),
          );
        } else if (this.isModelNotFoundError(error)) {
          errors.push(
            new AIProviderError(
              `Model ${modelToTry} not found`,
              'model_not_found',
              error,
            ),
          );
        } else {
          errors.push(
            new AIProviderError(
              `Server error on model ${modelToTry}: ${error.message}`,
              'server_error',
              error,
            ),
          );
        }

        console.warn(
          `[AI Provider] Failed with model ${modelToTry}, trying next fallback...`,
          error.message,
        );
      }
    }

    const lastError = errors[errors.length - 1];
    throw lastError ?? new AIProviderError('All models failed', 'server_error');
  }

  async listModels(): Promise<string[]> {
    try {
      const url = this.baseUrl.replace(/\/v1\/?$/, '') + '/v1/models';
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.client.apiKey}`,
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      if (data.data && Array.isArray(data.data)) {
        return data.data.map((m: any) => m.id).sort();
      }

      return [];
    } catch {
      return [];
    }
  }

  private isAuthError(err: Error): boolean {
    return (
      err.message.includes('401') ||
      err.message.includes('403') ||
      err.message.toLowerCase().includes('authentication') ||
      err.message.toLowerCase().includes('unauthorized') ||
      err.message.toLowerCase().includes('forbidden')
    );
  }

  private isRateLimitError(err: Error): boolean {
    return (
      err.message.includes('429') ||
      err.message.toLowerCase().includes('rate limit') ||
      err.message.toLowerCase().includes('too many requests') ||
      err.message.toLowerCase().includes('quota exceeded')
    );
  }

  private isModelNotFoundError(err: Error): boolean {
    return (
      err.message.includes('404') ||
      err.message.toLowerCase().includes('model not found') ||
      err.message.toLowerCase().includes('model_not_found') ||
      err.message.toLowerCase().includes('invalid model')
    );
  }
}
