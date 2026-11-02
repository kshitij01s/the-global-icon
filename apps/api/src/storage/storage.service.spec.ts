import { NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';

function makeService(): StorageService {
  const config = { get: () => '../../storage/development-only' } as unknown as ConfigService;
  return new StorageService(config);
}

describe('StorageService path safety', () => {
  const service = makeService();

  it.each([
    '../secrets.pdf',
    'magazines/pdfs/../../../etc/passwd.pdf',
    '/etc/passwd.pdf',
    'C:/Windows/win.pdf',
    'magazines\\pdfs\\x.pdf',
    'private/other.pdf',
    'magazines/pdfs/readme.txt',
  ])('rejects unsafe PDF key %s', async (key) => {
    await expect(service.resolvePrivatePdf(key)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects missing key', async () => {
    await expect(service.resolvePrivatePdf(null)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses to serve PDFs through the public image resolver', async () => {
    await expect(
      service.resolvePublicImage('magazines/pdfs/supplied/Magazine_1.pdf'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
