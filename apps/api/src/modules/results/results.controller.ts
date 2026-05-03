import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
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
  list(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.results.listFor(user.id, id);
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
