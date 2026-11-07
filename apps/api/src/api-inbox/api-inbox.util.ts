const SECRET_PATTERNS = [
  /password["']?\s*[:=]\s*["'][^"']+/gi,
  /api[_-]?key["']?\s*[:=]\s*["'][^"']+/gi,
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  /eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]*/g,
  /postgres(?:ql)?:\/\/[^\s]+/gi,
  /mongodb(?:\+srv)?:\/\/[^\s]+/gi,
  /-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+PRIVATE KEY-----/g,
];

const MAX_TECHNICAL_CHARS = 8_000;

/** Strip credentials and collapse noisy HTML / whitespace for safe operator storage. */
export function normalizeTechnicalError(raw: string | Error | unknown): string {
  let text = '';
  if (raw instanceof Error) text = `${raw.name}: ${raw.message}`;
  else if (typeof raw === 'string') text = raw;
  else if (raw == null) text = '';
  else {
    try {
      text = JSON.stringify(raw);
    } catch {
      text = String(raw);
    }
  }

  text = text.replace(/\r\n/g, '\n').trim();
  if (!text) return '';

  // Drop huge HTML blobs (keep a short marker)
  if (/<\/?[a-z][\s\S]*>/i.test(text) && text.length > 400) {
    const status = text.match(/\b(HTTP\/?\d(?:\.\d)?\s+)?([45]\d{2})\b/);
    text = `Upstream HTML error response truncated${status ? ` (status ${status[2]})` : ''}.`;
  }

  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, '[REDACTED]');
  }

  text = text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ');
  if (text.length > MAX_TECHNICAL_CHARS) {
    text = `${text.slice(0, MAX_TECHNICAL_CHARS)}…[truncated]`;
  }
  return text.trim();
}

export function isNoiseError(technical: string): boolean {
  if (!technical) return true;
  const lower = technical.toLowerCase();
  // Ordinary user-correctable messages / Nest validation noise
  const noise = [
    'validation failed',
    'bad request exception',
    'unauthorized',
    'forbidden',
    'not found exception',
    'invalid credentials',
    'incorrect password',
    'email or username is already registered',
    'we could not',
    'please try again',
  ];
  // Only treat as noise when the whole message is short and matches expected UX copy
  if (technical.length < 180 && noise.some((n) => lower.includes(n))) {
    // Still keep real infra phrases
    if (
      lower.includes('econnrefused') ||
      lower.includes('etimedout') ||
      lower.includes('503') ||
      lower.includes('502') ||
      lower.includes('storage') ||
      lower.includes('prisma')
    ) {
      return false;
    }
    return true;
  }
  return false;
}

export function sanitizeMetadata(
  input: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!input) return null;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    const k = key.toLowerCase();
    if (
      k.includes('password') ||
      k.includes('secret') ||
      k.includes('token') ||
      k.includes('authorization') ||
      k.includes('apikey') ||
      k.includes('api_key') ||
      k.includes('card')
    ) {
      out[key] = '[REDACTED]';
      continue;
    }
    if (typeof value === 'string') {
      out[key] = normalizeTechnicalError(value).slice(0, 500);
    } else if (typeof value === 'number' || typeof value === 'boolean' || value == null) {
      out[key] = value;
    } else {
      try {
        out[key] = JSON.parse(JSON.stringify(value));
      } catch {
        out[key] = String(value).slice(0, 200);
      }
    }
  }
  return out;
}
