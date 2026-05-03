import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { SelfCheckService } from './self-check.service';
import { ElasticsearchModule } from '../integrations/elasticsearch/es.module';

@Module({
  imports: [ElasticsearchModule],
  controllers: [HealthController],
  providers: [SelfCheckService],
  exports: [SelfCheckService],
})
export class HealthModule {}
