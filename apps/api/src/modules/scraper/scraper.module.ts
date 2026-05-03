import { Module } from '@nestjs/common';
import { GoogleNewsService } from './google-news.service';
import { PlaywrightService } from './playwright.service';

@Module({
  providers: [GoogleNewsService, PlaywrightService],
  exports: [GoogleNewsService, PlaywrightService],
})
export class ScraperModule {}
