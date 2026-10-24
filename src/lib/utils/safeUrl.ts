/**
 * Returns a normalised absolute http(s) URL, or undefined when the value is
 * empty or uses any other scheme (javascript:, data:, vbscript:, file:, …).
 *
 * Bare domains such as "linkedin.com/in/jane" are upgraded to https:// so that
 * user-entered profile links keep working.
 */
export function safeHttpUrl(value: unknown, options: { allowDataImage?: boolean } = {}): string | undefined {
  if (typeof value !== 'string') return undefined;
  // Strip whitespace and control characters browsers ignore inside schemes.
  const trimmed = value.replace(/[\u0000-\u001F\u007F]/g, '').trim();
  if (!trimmed) return undefined;

  if (options.allowDataImage && /^data:image\/(png|jpe?g|gif|webp);base64,[a-z0-9+/=\s]+$/i.test(trimmed)) {
    return trimmed;
  }

  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed);
  const candidate = hasScheme
    ? trimmed
    : trimmed.startsWith('//')
      ? `https:${trimmed}`
      : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
    if (!url.hostname || (!url.hostname.includes('.') && url.hostname !== 'localhost')) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}
