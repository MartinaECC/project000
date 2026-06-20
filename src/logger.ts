export type LogLevel = 'info' | 'warn' | 'error';

export type Logger = {
  info(event: string, fields?: Record<string, unknown>): void;
  warn(event: string, fields?: Record<string, unknown>): void;
  error(event: string, fields?: Record<string, unknown>): void;
};

export type LoggerOptions = {
  sink?: (record: string) => void;
};

const secretKeyPattern = /(api[-_]?key|secret|token|authorization|password|credential)/iu;

export function createLogger(options: LoggerOptions = {}): Logger {
  const sink = options.sink ?? ((record: string) => console.log(record));
  return {
    info: (event, fields = {}) => write(sink, 'info', event, fields),
    warn: (event, fields = {}) => write(sink, 'warn', event, fields),
    error: (event, fields = {}) => write(sink, 'error', event, fields)
  };
}

export const logger = createLogger();

export function errorFields(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack
    };
  }

  return { errorMessage: String(error) };
}

export function redactValue(value: unknown, key = ''): unknown {
  if (secretKeyPattern.test(key)) {
    return '[redacted]';
  }

  if (typeof value === 'string') {
    return value.startsWith('sk-') || value.startsWith('Bearer ') ? '[redacted]' : value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([childKey, childValue]) => [
        childKey,
        redactValue(childValue, childKey)
      ])
    );
  }

  return value;
}

function write(
  sink: (record: string) => void,
  level: LogLevel,
  event: string,
  fields: Record<string, unknown>
): void {
  sink(
    JSON.stringify({
      level,
      event,
      ...redactValue(fields)
    })
  );
}
