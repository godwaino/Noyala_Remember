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

// Field-name redaction alone misses PII that arrives inside a field never
// meant to carry it — e.g. a caught `Error.message` or a provider's raw
// error-response body, both logged verbatim elsewhere in this codebase,
// can echo back a contact's email address (a provider commonly quotes the
// offending recipient in a rejection message). Scrub anything
// email-shaped out of every string value, regardless of its key, as a
// second layer under the key-based redaction above.
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

type LogFields = Record<string, unknown>;

function scrubValue(value: unknown): unknown {
  return typeof value === "string" ? value.replace(EMAIL_PATTERN, "[redacted-email]") : value;
}

function redact(fields: LogFields): LogFields {
  const safe: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    safe[key] = REDACTED_KEYS.has(key) ? "[redacted]" : scrubValue(value);
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
