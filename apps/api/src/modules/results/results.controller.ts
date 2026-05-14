import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IsBoolean, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { ResultsService } from './results.service';

class FilterPromptDto {
  @IsString()
  prompt!: string;
}

class FavoriteDto {
  @IsBoolean()
  favorite!: boolean;
}

@UseGuards(JwtAuthGuard)
@Controller(['searches/:id', 'jobs/:id'])
export class ResultsController {
  constructor(private readonly results: ResultsService) {}

  @Get('results')
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
    @Query('q') q?: string,
    @Query('keyword') keyword?: string,
    @Query('time') time?: string,
    @Query('favorite') favorite?: string,
  ) {
    const page = pageRaw ? Number(pageRaw) : undefined;
    const pageSize = pageSizeRaw ? Number(pageSizeRaw) : undefined;
    return this.results.listFor(user.id, id, {
      page,
      pageSize,
      q,
      keyword,
      time,
      favorite: favorite === '1' || favorite === 'true',
    });
  }

  @Post('filter')
  apply(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: FilterPromptDto,
  ) {
    return this.results.filterPrompt(user.id, id, dto.prompt ?? '');
  }

  @Patch('results/:resultId/favorite')
  setFavorite(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('resultId') resultId: string,
    @Body() dto: FavoriteDto,
  ) {
    return this.results.setFavorite(user.id, id, resultId, dto.favorite);
  }
}
