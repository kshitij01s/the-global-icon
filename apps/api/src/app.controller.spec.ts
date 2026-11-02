import { AppController } from './app.controller';
import type { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  it('reports ok when the database answers', async () => {
    const prisma = { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };
    const controller = new AppController(prisma as unknown as PrismaService);
    const result = await controller.health();
    expect(result.status).toBe('ok');
    expect(result.database).toBe('up');
  });

  it('reports degraded when the database is unreachable', async () => {
    const prisma = { $queryRaw: jest.fn().mockRejectedValue(new Error('down')) };
    const controller = new AppController(prisma as unknown as PrismaService);
    const result = await controller.health();
    expect(result.status).toBe('degraded');
    expect(result.database).toBe('down');
  });
});
