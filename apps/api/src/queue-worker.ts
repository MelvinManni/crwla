import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

/**
 * Standalone worker entrypoint. The same Nest application is bootstrapped
 * but never listens for HTTP — it just initializes BullMQ processors and
 * waits on the queues. Use this when you want crawl + indexing to run on a
 * separate node from the API host.
 *
 * Usage: `npm run worker:dev` (ts-node) or `npm run worker` (compiled).
 */
async function bootstrap() {
  const logger = new Logger('Worker');
  const app = await NestFactory.createApplicationContext(AppModule);
  await app.init();
  logger.log('CRWLA worker online — listening on BullMQ queues');
  // Keep the process alive; processors are registered via BullModule.
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[worker] failed:', err);
  process.exit(1);
});
