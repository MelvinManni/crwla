import { Module } from '@nestjs/common';
import { LlmExtractorService } from './llm.service';
import { LlmController } from './llm.controller';

@Module({
  controllers: [LlmController],
  providers: [LlmExtractorService],
  exports: [LlmExtractorService],
})
export class LlmModule {}
