export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export interface Logger {
  error(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

export class ConsoleLogger implements Logger {
  constructor(private level: LogLevel = LogLevel.INFO) {}

  error(message: string, ...args: any[]): void {
    if (this.level >= LogLevel.ERROR) {
      console.error(`[CC-MODULES ERROR] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.level >= LogLevel.WARN) {
      console.warn(`[CC-MODULES WARN] ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.level >= LogLevel.INFO) {
      console.info(`[CC-MODULES INFO] ${message}`, ...args);
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.level >= LogLevel.DEBUG) {
      console.debug(`[CC-MODULES DEBUG] ${message}`, ...args);
    }
  }

}

export class NoOpLogger implements Logger {
  error(): void {}
  warn(): void {}
  info(): void {}
  debug(): void {}
}