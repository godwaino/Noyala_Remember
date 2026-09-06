/**
 * Pure URL builders for the send handoff — duplicated from
 * apps/web/src/components/message-handoff-links.ts (a tiny, dependency-free
 * module with no "server-only" guard there either) rather than imported,
 * since apps/mobile doesn't depend on apps/web. "Opening an app is not a
 * send" — see docs/product.md's sending/approval policy.
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
