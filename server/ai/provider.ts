export interface AIProviderConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  fallbacks: string[];
  timeoutMs: number;
  maxTokens: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  signal?: AbortSignal;
  model?: string;
  maxTokens?: number;
}

export interface AIProvider {
  readonly name: string;
  readonly baseUrl: string;
  readonly defaultModel: string;
  chat(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<string>;
  listModels(): Promise<string[]>;
}

export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly type: 'auth' | 'rate_limit' | 'server_error' | 'timeout' | 'model_not_found',
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}
