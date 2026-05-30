import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as express from 'express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { SelfCheckService } from './health/self-check.service';
import { AuthService } from './modules/auth/auth.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);

  // Trust the first proxy hop so `req.ip` (and the rate limiter's per-client
  // tracking) reflects the real client via X-Forwarded-For — the web app's
  // Next.js rewrite and most deploy platforms (Railway, etc.) sit in front.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Capture rawBody for the Polar webhook so signatures can be verified.
  // The verifier needs the exact bytes — once express.json() has parsed and
  // re-stringified, the signature is invalid.
  app.use(
    express.json({
      limit: '1mb',
      verify: (req: express.Request & { rawBody?: Buffer }, _res, buf) => {
        if (req.originalUrl?.endsWith('/billing/webhook')) {
          req.rawBody = Buffer.from(buf);
        }
      },
    }),
  );
  app.use(cookieParser());
  // CORS_ORIGIN is a comma-separated allowlist. With credentials enabled the
  // browser forbids `*`, so we pass the explicit list and the cors middleware
  // reflects whichever origin matches the request.
  const corsOrigins = config
    .get<string>('CORS_ORIGIN', 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });
  app.setGlobalPrefix(config.get<string>('API_BASE_PATH', '/api'));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  // Seed admin if needed (idempotent).
  await app.get(AuthService).ensureAdmin();

  // Boot-time self-check — surfaces broken invariants from HARNESS.md with
  // exact repair commands. Does not block startup unless Postgres is down.
  const report = await app.get(SelfCheckService).run();
  if (!report.postgres.ok) {
    logger.error('Postgres self-check failed — aborting');
    await app.close();
    process.exit(1);
  }

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  logger.log(`CRWLA API listening on http://localhost:${port}${config.get<string>('API_BASE_PATH', '/api')}`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[bootstrap] failed:', err);
  process.exit(1);
});
