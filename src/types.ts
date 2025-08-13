export interface ClaudeCodeConfig {
  model?: string;
  outputFormat?: 'text' | 'json' | 'stream-json';
  verbose?: boolean;
  timeout?: number;
}

export interface ClaudeCodeResponse {
  success: boolean;
  data?: string;
  error?: string;
  executionTime?: number;
}

export interface ClaudeCodeClient {
  queryWithSessionId(prompt: string, sessionId: string, config?: ClaudeCodeConfig): Promise<ClaudeCodeResponse>;
  isClaudeCodeAvailable(): Promise<boolean>;
  getVersion(): Promise<string | null>;
}

export interface Logger {
  error(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}