import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
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
  ) {
    const page = pageRaw ? Number(pageRaw) : undefined;
    const pageSize = pageSizeRaw ? Number(pageSizeRaw) : undefined;
    return this.results.listFor(user.id, id, { page, pageSize });
  }

  @Post('filter')
  apply(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: FilterPromptDto,
  ) {
    return this.results.filterPrompt(user.id, id, dto.prompt ?? '');
  }
}
