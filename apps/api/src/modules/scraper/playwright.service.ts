import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PlaywrightService {
  constructor(private readonly config: ConfigService) {}

  /**
   * Heavy fallback for JS-rendered pages. Lazy-imported so playwright stays
   * optional — the module loads fine if browsers aren't installed.
   * Run `npx playwright install chromium` to fetch the binary first.
   */
  async render(url: string): Promise<string> {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    try {
      const ctx = await browser.newContext({
        userAgent: this.config.get<string>('USER_AGENT', 'CRWLA/1.0'),
      });
      const page = await ctx.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      return await page.content();
    } finally {
      await browser.close();
    }
  }
}
