process.env.DATABASE_URL ??=
  'postgresql://postgres:postgres@localhost:5432/the_global_icon_test?schema=public';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

/**
 * Smoke tests that do not require a running database: /health degrades
 * gracefully and protected routes reject anonymous callers before any query.
 */
describe('API smoke (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health responds', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(['ok', 'degraded']).toContain((res.body as { status: string }).status);
  });

  it('GET /api/admin/dashboard requires authentication', async () => {
    await request(app.getHttpServer()).get('/api/admin/dashboard').expect(401);
  });

  it('POST /api/auth/register rejects attempts to set a role', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'a@example.test',
        username: 'someone',
        password: 'a-long-enough-password',
        role: 'SUPER_ADMIN',
      })
      .expect(400);
  });
});
