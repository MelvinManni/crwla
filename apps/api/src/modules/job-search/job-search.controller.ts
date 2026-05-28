import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { JobSearchService } from './job-search.service';
import { CreateJobSearchDto } from './dto/create-job-search.dto';

@UseGuards(JwtAuthGuard)
@Controller('job-search')
export class JobSearchController {
  constructor(private readonly service: JobSearchService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateJobSearchDto,
  ) {
    const search = await this.service.createSearch(user.id, dto);
    return { search };
  }

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limitRaw?: string,
  ) {
    const items = await this.service.listForUser(user.id, {
      limit: limitRaw ? Number(limitRaw) : undefined,
    });
    return { items };
  }

  /**
   * Reference data: hot titles, countries, headline stats. Drives the
   * Search screen UI without hardcoded constants.
   */
  @Get('meta')
  meta() {
    return this.service.getMeta();
  }

  @Get(':id/results')
  results(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getResults(user.id, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.deleteSearch(user.id, id);
  }
}
