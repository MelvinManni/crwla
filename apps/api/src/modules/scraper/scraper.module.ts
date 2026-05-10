import { Module } from '@nestjs/common';
import { GoogleNewsService } from './google-news.service';
import { PlaywrightService } from './playwright.service';
import { ThumbnailService } from './thumbnail.service';
import { GoogleNewsSource } from './sources/google-news.source';
import { RedditSource } from './sources/reddit.source';
import { HackerNewsSource } from './sources/hacker-news.source';
import { BlueskySource } from './sources/bluesky.source';
import { SourceRegistry } from './sources/source.registry';

@Module({
  providers: [
    GoogleNewsService,
    PlaywrightService,
    ThumbnailService,
    GoogleNewsSource,
    RedditSource,
    HackerNewsSource,
    BlueskySource,
    SourceRegistry,
  ],
  exports: [
    GoogleNewsService,
    PlaywrightService,
    ThumbnailService,
    SourceRegistry,
  ],
})
export class ScraperModule {}
