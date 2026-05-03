import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { RunsService } from './runs.service';

@UseGuards(JwtAuthGuard)
@Controller(['searches/:id/runs', 'jobs/:id/runs'])
export class RunsController {
  constructor(private readonly runs: RunsService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const runs = await this.runs.listFor(user.id, id);
    return { runs };
  }
}
