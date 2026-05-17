import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ShareService } from './share.service';

/**
 * Public, unauthenticated read of a shared search at /api/p/<slug>. The
 * matching FE route lives at /p/<slug> on the web app.
 */
@Controller('p')
export class ShareController {
  constructor(private readonly share: ShareService) {}

  @Get(':slug')
  async getBySlug(
    @Param('slug') slug: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
  ) {
    const out = await this.share.getBySlug(slug, {
      page: pageRaw ? Number(pageRaw) : undefined,
      pageSize: pageSizeRaw ? Number(pageSizeRaw) : undefined,
    });
    if (!out) {
      // 404 covers both "slug never existed" and "owner revoked public
      // access" — same response either way so we don't leak slug state.
      throw new NotFoundException('share not found');
    }
    return out;
  }
}
