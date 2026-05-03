/* eslint-disable no-console */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SelfCheckService } from '../src/health/self-check.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  const report = await app.get(SelfCheckService).run();
  await app.close();
  if (!report.ok) process.exit(1);
}

main().catch((err) => {
  console.error('[self-check] failed:', err);
  process.exit(1);
});
