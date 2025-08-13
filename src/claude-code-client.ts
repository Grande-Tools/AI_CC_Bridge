import * as childProcess from 'child_process';
import * as util from 'util';
import { ClaudeCodeConfig, ClaudeCodeResponse, ClaudeCodeClient } from './types';

const execAsync = util.promisify(childProcess.exec);

export class ClaudeCodeClientImpl implements ClaudeCodeClient {
  private defaultTimeout = 60000; // 60 seconds

  constructor(private defaultConfig: ClaudeCodeConfig = {}) {}


  async queryWithSessionId(prompt: string, sessionId: string, config: ClaudeCodeConfig = {}): Promise<ClaudeCodeResponse> {
    const startTime = Date.now();
    const mergedConfig = { ...this.defaultConfig, ...config };
    
    try {
      // Try to resume existing session first
      const resumeCommand = this.buildSessionCommand(prompt, sessionId, 'resume', mergedConfig);
      
      try {
        const { stdout } = await execAsync(resumeCommand, {
          timeout: mergedConfig.timeout || this.defaultTimeout,
          encoding: 'utf8',
          killSignal: 'SIGKILL'
        });

        return {
          success: true,
          data: stdout.trim(),
          executionTime: Date.now() - startTime
        };
      } catch (resumeError) {
        // If resume fails, try to create new session with session-id
        const createCommand = this.buildSessionCommand(prompt, sessionId, 'create', mergedConfig);
        
        const { stdout } = await execAsync(createCommand, {
          timeout: mergedConfig.timeout || this.defaultTimeout,
          encoding: 'utf8',
          killSignal: 'SIGKILL'
        });

        return {
          success: true,
          data: stdout.trim(),
          executionTime: Date.now() - startTime
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime
      };
    }
  }

  async isClaudeCodeAvailable(): Promise<boolean> {
    try {
      await execAsync('which claude', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async getVersion(): Promise<string | null> {
    try {
      const { stdout } = await execAsync('claude --version', { timeout: 5000 });
      return stdout.trim();
    } catch {
      return null;
    }
  }


  private buildSessionCommand(prompt: string, sessionId: string, type: 'resume' | 'create', config: ClaudeCodeConfig): string {
    let command = `echo "${this.escapeShellArg(prompt)}" | claude`;
    
    if (type === 'resume') {
      command += ` --resume ${sessionId}`;
    } else {
      command += ` --session-id ${sessionId}`;
    }
    
    if (config.model) {
      command += ` --model ${config.model}`;
    }
    
    if (config.outputFormat) {
      command += ` --output-format ${config.outputFormat}`;
    }
    
    if (config.verbose) {
      command += ' --verbose';
    }
    
    return command;
  }

  private escapeShellArg(arg: string): string {
    return arg.replace(/"/g, '\\"');
  }
}