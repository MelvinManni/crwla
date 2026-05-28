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
import { TrackedCompanyStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JobSearchService } from './job-search.service';
import {
  CreateTrackedCompanyDto,
  UpdateTrackedCompanyDto,
} from './dto/tracked-company.dto';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/tracked-companies')
export class AdminTrackedCompaniesController {
  constructor(private readonly service: JobSearchService) {}

  @Get()
  async list(@Query('q') q?: string, @Query('status') status?: string) {
    const items = await this.service.listCompanies({
      q,
      status: status as TrackedCompanyStatus | undefined,
    });
    return { items };
  }

  @Post()
  async create(@Body() dto: CreateTrackedCompanyDto) {
    const company = await this.service.createCompany(dto);
    return { company };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTrackedCompanyDto) {
    const company = await this.service.updateCompany(id, dto);
    return { company };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.service.deleteCompany(id);
  }
}
