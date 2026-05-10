import { Module } from '@nestjs/common';
import { SourcesController } from './sources.controller';
import { ScraperModule } from '../scraper/scraper.module';

@Module({
  imports: [ScraperModule],
  controllers: [SourcesController],
})
export class SourcesModule {}
