import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
  async list(@CurrentUser() user: AuthenticatedUser) {
    const jobs = await this.searches.listForUser(user.id);
    return { jobs }; // key kept as `jobs` for backward-compatible UI
  }

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSearchDto) {
    const job = await this.searches.create(user.id, dto);
    return { job };
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
}
