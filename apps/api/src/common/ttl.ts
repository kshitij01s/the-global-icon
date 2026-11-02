const UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
  w: 604800,
};

/**
 * Converts a TTL such as "15m", "7d" or "3600" into seconds.
 * Throws on invalid input so misconfiguration fails fast at startup.
 */
export function ttlToSeconds(value: string): number {
  const match = /^(\d+)\s*([smhdw])?$/i.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid TTL "${value}". Use values like 15m, 12h or 7d.`);
  }
  const amount = Number(match[1]);
  const unit = (match[2] ?? 's').toLowerCase();
  return amount * UNIT_SECONDS[unit];
}
