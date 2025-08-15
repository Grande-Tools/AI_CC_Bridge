import { ClaudeCodeClientImpl } from "./claude-code-client";
import { ClaudeCodeConfig, ClaudeCodeResponse } from "./types";
import { Logger, ConsoleLogger, LogLevel, NoOpLogger } from "./logger";
import { ClaudeMemoryReader } from "./claude-memory";

export class CCModules {
  private client: ClaudeCodeClientImpl;
  private logger: Logger;

  constructor(config: ClaudeCodeConfig = {}, logger?: Logger) {
    this.client = new ClaudeCodeClientImpl(config);
    this.logger = logger || new ConsoleLogger(LogLevel.INFO);
  }

  static create(config: ClaudeCodeConfig = {}, silent = false): CCModules {
    const logger = silent ? new NoOpLogger() : new ConsoleLogger(LogLevel.INFO);
    return new CCModules(config, logger);
  }

  async initialize(): Promise<boolean> {
    const isAvailable = await this.client.isClaudeCodeAvailable();
    if (!isAvailable) {
      this.logger.error(
        "Claude Code CLI not found. Please ensure claude is installed and available in PATH."
      );
      return false;
    }

    return true;
  }

  async ask(
    prompt: string,
    sessionId: string,
    config?: ClaudeCodeConfig
  ): Promise<ClaudeCodeResponse> {
    this.logger.debug(
      `Sending session query to Claude Code: ${prompt.substring(0, 100)}...`
    );

    // Check if we should include CLAUDE.md context
    let enhancedPrompt = prompt;
    if (config?.includeClaude !== false) { // Default to true unless explicitly disabled
      const claudeContext = await this.getClaudeContext();
      if (claudeContext) {
        enhancedPrompt = `${claudeContext}\n\n---\n\n${prompt}`;
        this.logger.debug('Added CLAUDE.md context to prompt');
      }
    }

    const response = await this.client.queryWithSessionId(
      enhancedPrompt,
      sessionId,
      config
    );

    if (response.success) {
      this.logger.debug(
        `Session query completed successfully in ${response.executionTime}ms`
      );
    } else {
      this.logger.error(`Session query failed: ${response.error}`);
    }

    return response;
  }

  async isReady(): Promise<boolean> {
    return this.client.isClaudeCodeAvailable();
  }

  async getClaudeVersion(): Promise<string | null> {
    return this.client.getVersion();
  }

  async getClaudeContext(startDir?: string): Promise<string | null> {
    try {
      const memoryFiles = await ClaudeMemoryReader.findAndReadClaudeFiles(startDir);
      if (memoryFiles.length === 0) {
        return null;
      }
      return ClaudeMemoryReader.formatForClaudeContext(memoryFiles);
    } catch (error) {
      this.logger.warn(`Failed to read CLAUDE.md files: ${error}`);
      return null;
    }
  }

  // MCP Support - just handles permissions, no file management
  static createWithMCPSupport(
    config: ClaudeCodeConfig = {},
    silent = false
  ): CCModules {
    // Enable skip permissions by default for MCP
    const mcpConfig = {
      dangerouslySkipPermissions: true,
      ...config
    };

    return new CCModules(mcpConfig, silent ? new NoOpLogger() : new ConsoleLogger(LogLevel.INFO));
  }
}
