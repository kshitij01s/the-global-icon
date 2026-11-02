import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { API_PREFIX } from './common/urls';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const isProduction = config.get<string>('NODE_ENV') === 'production';

  if (isProduction) app.set('trust proxy', 1);

  // Security headers. Swagger UI needs inline scripts, so relax CSP for /docs only.
  const strictHelmet = helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });
  const docsHelmet = helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });
  app.use((req: Request, res: Response, next: NextFunction) =>
    req.path.startsWith('/docs') ? docsHelmet(req, res, next) : strictHelmet(req, res, next),
  );

  app.use(cookieParser());

  const origins = (config.get<string>('CORS_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    exposedHeaders: ['Content-Disposition', 'Content-Range', 'Accept-Ranges'],
  });

  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('THE GLOBAL ICON API')
    .setDescription('Stories That Shape Tomorrow. — public and admin API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  const port = Number(config.get<string>('PORT') ?? 4000);
  await app.listen(port);
  new Logger('Bootstrap').log(
    `API listening on http://localhost:${port}/${API_PREFIX} — docs at /docs`,
  );
}

void bootstrap();
