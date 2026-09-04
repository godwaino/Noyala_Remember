import "server-only";

/**
 * Structured, privacy-safe logging. Fields that could carry personal
 * content (message bodies, memory text, contact details) must never be
 * passed here — pass identifiers (personId, draftId) instead. See
 * docs/product.md ("Encrypt transport, avoid personal data in logs...")
 * and docs/architecture.md's threat model.
 */

const REDACTED_KEYS = new Set([
  "content",
  "notes",
  "finalContent",
  "final_content",
  "body",
  "email",
  "phone",
  "displayName",
  "display_name",
]);

type LogFields = Record<string, unknown>;

function redact(fields: LogFields): LogFields {
  const safe: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    safe[key] = REDACTED_KEYS.has(key) ? "[redacted]" : value;
  }
  return safe;
}

function write(level: "info" | "warn" | "error", message: string, fields: LogFields = {}) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...redact(fields),
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (message: string, fields?: LogFields) => write("info", message, fields),
  warn: (message: string, fields?: LogFields) => write("warn", message, fields),
  error: (message: string, fields?: LogFields) => write("error", message, fields),
};
