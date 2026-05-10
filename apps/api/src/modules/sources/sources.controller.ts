import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SourceRegistry } from '../scraper/sources/source.registry';
import { SOURCE_CATEGORIES } from '../scraper/sources/source.types';

@UseGuards(JwtAuthGuard)
@Controller('sources')
export class SourcesController {
  constructor(
    private readonly registry: SourceRegistry,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Sources visible to the current user, with their disabled categories so
   * the search-builder can show the right hints. Shape:
   *   { sources: [{id, label, category}], disabledCategories: string[] }
   */
  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    const u = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { disabledSourceCategories: true },
    });
    const disabled = u?.disabledSourceCategories ?? [];
    return {
      categories: SOURCE_CATEGORIES,
      disabledCategories: disabled,
      sources: this.registry.availableFor(disabled),
      // Full catalogue (pre-permission) so the UI can grey out forbidden
      // sources instead of silently hiding them.
      all: this.registry.all(),
    };
  }
}
