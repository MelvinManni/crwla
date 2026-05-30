import { Body, Controller, NotFoundException, Post } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { DigestTokenService } from './digest-token.service';
import { PauseDigestDto } from './dto/pause-digest.dto';

/**
 * Public, unauthenticated one-click "pause digest" endpoint. Reached from the
 * digest email — there's no session, so authorization is the signed token
 * itself (see {@link DigestTokenService}). The matching FE route lives at
 * /digest/unsubscribe on the web app.
 */
@Controller('digest')
export class DigestController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: DigestTokenService,
  ) {}

  @Post('unsubscribe')
  async unsubscribe(@Body() dto: PauseDigestDto): Promise<{ ok: true; crawlName: string }> {
    const searchId = this.tokens.verify(dto.token);
    if (!searchId) throw new NotFoundException('invalid link');
    const search = await this.prisma.search.findFirst({
      where: { id: searchId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!search) throw new NotFoundException('crawl not found');
    // Idempotent: clicking again (or an email scanner prefetching the link)
    // just keeps the digest paused — the user's intent when they click.
    await this.prisma.search.update({
      where: { id: search.id },
      data: { digestEnabled: false },
    });
    return { ok: true, crawlName: search.name };
  }
}
