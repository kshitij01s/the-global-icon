import { buildFingerprint } from './api-inbox.fingerprint';
import { classifySeverity, defaultCustomerMessage, defaultTitle } from './api-inbox.classifier';
import { ApiInboxSeverity } from './api-inbox.enums';
import { isNoiseError, normalizeTechnicalError, sanitizeMetadata } from './api-inbox.util';

describe('api-inbox util', () => {
  it('normalizes whitespace and redacts secrets', () => {
    const out = normalizeTechnicalError(
      'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb  password="secret123"\n\n\nok',
    );
    expect(out).not.toMatch(/eyJ/);
    expect(out).not.toMatch(/secret123/);
    expect(out).toContain('[REDACTED]');
  });

  it('truncates large HTML upstream responses', () => {
    const html = `<html><body>${'x'.repeat(600)}</body></html>`;
    const out = normalizeTechnicalError(html);
    expect(out).toMatch(/HTML error/i);
    expect(out).not.toContain('<html>');
  });

  it('skips empty and noise errors', () => {
    expect(normalizeTechnicalError('')).toBe('');
    expect(isNoiseError('')).toBe(true);
    expect(isNoiseError('Unauthorized')).toBe(true);
    expect(isNoiseError('ECONNREFUSED postgres')).toBe(false);
  });

  it('sanitizes metadata secrets', () => {
    const meta = sanitizeMetadata({
      token: 'abc',
      size: 12,
      note: 'ok',
    });
    expect(meta?.token).toBe('[REDACTED]');
    expect(meta?.size).toBe(12);
  });
});

describe('api-inbox fingerprint', () => {
  it('is stable for equivalent errors', () => {
    const a = buildFingerprint({
      category: 'file_storage',
      source: 'storage.service',
      technicalError: 'EACCES denied',
      entityType: 'magazine',
      entityId: 'm1',
    });
    const b = buildFingerprint({
      category: 'file_storage',
      source: 'storage.service',
      technicalError: 'EACCES denied',
      entityType: 'magazine',
      entityId: 'm1',
    });
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });

  it('differs when category changes', () => {
    const a = buildFingerprint({
      category: 'file_storage',
      source: 'storage.service',
      technicalError: 'EACCES denied',
    });
    const b = buildFingerprint({
      category: 'rss',
      source: 'storage.service',
      technicalError: 'EACCES denied',
    });
    expect(a).not.toBe(b);
  });
});

describe('api-inbox classifier', () => {
  it('classifies critical storage / db failures', () => {
    expect(classifySeverity('ECONNREFUSED database', 'database')).toBe(ApiInboxSeverity.CRITICAL);
    expect(classifySeverity('timeout retry', 'rss')).toBe(ApiInboxSeverity.WARNING);
  });

  it('allows explicit severity override', () => {
    expect(classifySeverity('timeout', 'rss', ApiInboxSeverity.INFO)).toBe(ApiInboxSeverity.INFO);
  });

  it('maps customer-safe messages without technical detail', () => {
    const msg = defaultCustomerMessage('magazine_upload');
    expect(msg.toLowerCase()).not.toContain('eacces');
    expect(msg.toLowerCase()).not.toContain('stack');
    expect(defaultTitle('magazine_upload', 'x')).toMatch(/Magazine PDF Upload Failed/);
  });
});
