/**
 * Pure URL builders for Master Build Prompt §9's send handoff. No
 * "server-only" guard — imported directly by client components. Truncates
 * for URL-length limits (mailto/sms/wa.me links break above a few thousand
 * characters on some platforms); the full, untruncated text still goes to
 * the clipboard via the separate copy action.
 */

const MAX_URL_CONTENT_LENGTH = 1800;

function truncateForUrl(content: string): string {
  return content.length > MAX_URL_CONTENT_LENGTH
    ? `${content.slice(0, MAX_URL_CONTENT_LENGTH - 1)}…`
    : content;
}

export function buildWhatsAppUrl(phone: string | null, content: string): string {
  const digits = phone ? phone.replace(/\D/g, "") : "";
  const text = encodeURIComponent(truncateForUrl(content));
  return digits ? `https://wa.me/${digits}?text=${text}` : `https://wa.me/?text=${text}`;
}

export function buildSmsUrl(phone: string | null, content: string): string {
  const text = encodeURIComponent(truncateForUrl(content));
  return phone ? `sms:${phone}?&body=${text}` : `sms:?&body=${text}`;
}

export function buildMailtoUrl(email: string | null, subject: string, content: string): string {
  const text = encodeURIComponent(truncateForUrl(content));
  const subj = encodeURIComponent(subject);
  return email ? `mailto:${email}?subject=${subj}&body=${text}` : `mailto:?subject=${subj}&body=${text}`;
}
