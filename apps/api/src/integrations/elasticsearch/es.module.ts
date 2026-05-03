import { Global, Module } from '@nestjs/common';
import { ElasticsearchService } from './es.service';

@Global()
@Module({
  providers: [ElasticsearchService],
  exports: [ElasticsearchService],
})
export class ElasticsearchModule {}
