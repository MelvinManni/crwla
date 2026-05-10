import { Injectable } from '@nestjs/common';
import { GoogleNewsService, type ScrapedItem } from '../google-news.service';
import type { SourceCrawler } from './source.types';

@Injectable()
export class GoogleNewsSource implements SourceCrawler {
  readonly id = 'google_news';
  readonly label = 'Google News';
  readonly category = 'news' as const;

  constructor(private readonly google: GoogleNewsService) {}

  async searchKeyword(keyword: string): Promise<ScrapedItem[]> {
    return this.google.searchKeyword(keyword);
  }
}
