import { createHash } from 'node:crypto';
import { normalizeTechnicalError } from './api-inbox.util';

/** Stable signature used for OPEN/ACKNOWLEDGED deduplication. */
export function buildFingerprint(input: {
  category: string;
  source: string;
  technicalError: string;
  entityType?: string | null;
  entityId?: string | null;
}): string {
  const normalized = normalizeTechnicalError(input.technicalError)
    .toLowerCase()
    // Drop volatile timestamps / uuids / request ids for grouping
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, '')
    .replace(/\b\d{4}-\d{2}-\d{2}t[\d:.z+-]+\b/gi, '')
    .replace(/\breq(?:uest)?[-_ ]?id[=: ]+\S+/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);

  const material = [
    input.category.trim().toLowerCase(),
    input.source.trim().toLowerCase(),
    normalized,
    (input.entityType ?? '').trim().toLowerCase(),
    (input.entityId ?? '').trim(),
  ].join('|');

  return createHash('sha256').update(material).digest('hex');
}
