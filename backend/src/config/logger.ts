type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

const levelPriority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function resolveLevel(): LogLevel {
  const value = process.env.LOG_LEVEL?.trim().toLowerCase();

  if (value === 'debug' || value === 'warn' || value === 'error') {
    return value;
  }

  return 'info';
}

function safeSerialize(context?: LogContext): string {
  if (!context || Object.keys(context).length === 0) {
    return '';
  }

  try {
    return ` ${JSON.stringify(context)}`;
  } catch {
    return ' {"serialization":"failed"}';
  }
}

class Logger {
  readonly #scope: string;
  readonly #minLevel: LogLevel;

  constructor(scope = 'app', minLevel = resolveLevel()) {
    this.#scope = scope;
    this.#minLevel = minLevel;
  }

  child(scope: string): Logger {
    return new Logger(`${this.#scope}:${scope}`, this.#minLevel);
  }

  debug(message: string, context?: LogContext): void {
    this.#write('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.#write('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.#write('warn', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.#write('error', message, context);
  }

  #write(level: LogLevel, message: string, context?: LogContext): void {
    if (levelPriority[level] < levelPriority[this.#minLevel]) {
      return;
    }

    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${level.toUpperCase()} [${this.#scope}] ${message}${safeSerialize(context)}`;

    if (level === 'error') {
      console.error(line);
      return;
    }

    if (level === 'warn') {
      console.warn(line);
      return;
    }

    console.log(line);
  }
}

export const logger = new Logger();
