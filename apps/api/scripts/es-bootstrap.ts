/* eslint-disable no-console */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ElasticsearchService } from '../src/integrations/elasticsearch/es.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const es = app.get(ElasticsearchService);
  if (!es.enabled) {
    console.log('ES disabled (ELASTICSEARCH_URL not set) — nothing to bootstrap');
    await app.close();
    return;
  }
  await es.ensureIndex();
  console.log(`Index ${es.index} ready`);
  await app.close();
}

main().catch((err) => {
  console.error('[es:bootstrap] failed:', err);
  process.exit(1);
});
