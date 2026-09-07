type LogFields = Record<string, string | number | boolean | null | undefined>;

function write(level: string, message: string, fields?: LogFields): void {
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...sanitize(fields),
  };
  const line = JSON.stringify(payload);
  if (level === "error") {
    process.stderr.write(`${line}\n`);
    return;
  }
  process.stdout.write(`${line}\n`);
}

const REDACT = /password|token|secret|authorization|cookie|apikey|api_key/i;

function sanitize(fields?: LogFields): LogFields {
  if (!fields) return {};
  const clean: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    clean[key] = REDACT.test(key) ? "[redacted]" : value;
  }
  return clean;
}

export const logger = {
  info(message: string, fields?: LogFields) {
    write("info", message, fields);
  },
  warn(message: string, fields?: LogFields) {
    write("warn", message, fields);
  },
  error(message: string, fields?: LogFields) {
    write("error", message, fields);
  },
};
