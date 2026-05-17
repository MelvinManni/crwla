import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { SearchesService } from './searches.service';
import { CreateSearchDto } from './dto/create-search.dto';
import { UpdateSearchDto } from './dto/update-search.dto';

@UseGuards(JwtAuthGuard)
@Controller(['searches', 'jobs']) // /api/searches canonical; /api/jobs legacy alias
export class SearchesController {
  constructor(private readonly searches: SearchesService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
    @Query('q') q?: string,
    @Query('keyword') keyword?: string,
    @Query('time') time?: string,
  ) {
    const page = pageRaw ? Number(pageRaw) : undefined;
    const pageSize = pageSizeRaw ? Number(pageSizeRaw) : undefined;
    const out = await this.searches.listForUser(user.id, {
      page,
      pageSize,
      q,
      keyword,
      time,
    });
    // `jobs` kept for backward-compatible UI; new clients read `items` + meta.
    return { jobs: out.items, ...out };
  }

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSearchDto) {
    const job = await this.searches.create(user.id, user.role, dto);
    return { job };
  }

  // Preview the auto-name a blank-name create would land on (e.g. "crwl001").
  // Routed before `/:id` so Nest doesn't pick up "next-name" as a search id.
  @Get('next-name')
  async nextName(@CurrentUser() user: AuthenticatedUser) {
    const name = await this.searches.nextAutoName(user.id);
    return { name };
  }

  @Get(':id')
  async get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const job = await this.searches.getOne(user.id, id);
    return { job };
  }

  @Patch(':id')
  async patch(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateSearchDto,
  ) {
    const job = await this.searches.update(user.id, id, dto);
    return { job };
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.searches.remove(user.id, id);
  }

  @Post(':id/run')
  run(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.searches.runNow(user.id, id);
  }

  // Enable share — provisions a slug if needed and flips publicAccess on.
  // Gated on the Pro+ resultSharing entitlement inside the service.
  @Post(':id/share')
  enableShare(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.searches.enableShare(user.id, id);
  }

  // Disable share — keeps the slug but flips publicAccess off so the
  // public page short-circuits to limited-access immediately.
  @Delete(':id/share')
  disableShare(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.searches.disableShare(user.id, id);
  }
}
