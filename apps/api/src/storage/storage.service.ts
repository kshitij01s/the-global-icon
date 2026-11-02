import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';

/** Prefixes (relative to STORAGE_ROOT) that may be served without authentication. */
const PUBLIC_PREFIXES = [
  'demo-pdf-covers/',
  'magazines/covers/',
  'articles/',
  'authors/',
  'leaders/',
  'partners/',
  'advertisements/',
];
const PUBLIC_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.svg']);

export const PUBLIC_CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
};

/**
 * Resolves storage keys to absolute paths strictly inside STORAGE_ROOT.
 * Absolute paths returned here must never be serialised into API responses.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly root: string;

  constructor(config: ConfigService) {
    this.root = path.resolve(
      process.cwd(),
      config.get<string>('STORAGE_ROOT') ?? '../../storage/development-only',
    );
    this.logger.log(`Storage root resolved (${path.basename(this.root)})`);
  }

  /** Normalises a key and rejects traversal / absolute paths. Returns null if unsafe. */
  private normaliseKey(key: string): string | null {
    if (!key || key.includes('\0') || key.includes('\\')) return null;
    if (path.posix.isAbsolute(key) || /^[a-zA-Z]:/.test(key)) return null;
    const normalised = path.posix.normalize(key);
    if (normalised.startsWith('..') || normalised.split('/').includes('..')) return null;
    return normalised;
  }

  private resolveInsideRoot(key: string): string | null {
    const normalised = this.normaliseKey(key);
    if (!normalised) return null;
    const absolute = path.resolve(this.root, ...normalised.split('/'));
    const relative = path.relative(this.root, absolute);
    if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
    return absolute;
  }

  /** Private PDF lookup. Only `.pdf` files under `magazines/pdfs/` are allowed. */
  async resolvePrivatePdf(key: string | null | undefined): Promise<{ absolutePath: string; size: number }> {
    if (!key) throw new NotFoundException('PDF not available');
    const normalised = this.normaliseKey(key);
    if (
      !normalised ||
      !normalised.startsWith('magazines/pdfs/') ||
      path.posix.extname(normalised).toLowerCase() !== '.pdf'
    ) {
      throw new NotFoundException('PDF not available');
    }
    return this.statFile(this.resolveInsideRoot(normalised));
  }

  /** Public image lookup restricted to whitelisted prefixes and image extensions. */
  async resolvePublicImage(
    key: string,
  ): Promise<{ absolutePath: string; size: number; contentType: string }> {
    const normalised = this.normaliseKey(key);
    if (!normalised || !PUBLIC_PREFIXES.some((prefix) => normalised.startsWith(prefix))) {
      throw new NotFoundException();
    }
    const ext = path.posix.extname(normalised).toLowerCase();
    if (!PUBLIC_EXTENSIONS.has(ext)) throw new NotFoundException();
    const file = await this.statFile(this.resolveInsideRoot(normalised));
    return { ...file, contentType: PUBLIC_CONTENT_TYPES[ext] };
  }

  /**
   * Writes a new file at a server-generated key (never a client-supplied name).
   * Refuses to overwrite and refuses keys outside STORAGE_ROOT.
   */
  async saveNew(key: string, data: Buffer): Promise<void> {
    const absolute = this.resolveInsideRoot(key);
    if (!absolute) throw new BadRequestException('Invalid storage key');
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, data, { flag: 'wx' });
  }

  private async statFile(
    absolutePath: string | null,
  ): Promise<{ absolutePath: string; size: number }> {
    if (!absolutePath) throw new NotFoundException();
    try {
      const stat = await fs.stat(absolutePath);
      if (!stat.isFile()) throw new NotFoundException();
      return { absolutePath, size: stat.size };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new NotFoundException('File not available');
    }
  }
}
