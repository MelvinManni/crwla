import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IsArray, IsBoolean, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { AlertFrequency } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { AlertsService } from './alerts.service';

class CreateAlertDto {
  @IsOptional() @IsString() searchId?: string;
  @IsString() @MinLength(1) keyword!: string;
  @IsOptional() @IsArray() @IsString({ each: true }) sources?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) locations?: string[];
  @IsOptional() @IsIn(['REALTIME', 'HOURLY', 'DAILY']) frequency?: AlertFrequency;
}

class PatchAlertDto {
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsIn(['REALTIME', 'HOURLY', 'DAILY']) frequency?: AlertFrequency;
}

@UseGuards(JwtAuthGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private readonly svc: AlertsService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
  ) {
    const page = pageRaw ? Number(pageRaw) : undefined;
    const pageSize = pageSizeRaw ? Number(pageSizeRaw) : undefined;
    const out = await this.svc.listForUser(user.id, { page, pageSize });
    return { alerts: out.items, ...out };
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAlertDto) {
    return this.svc.create(user.id, dto);
  }

  @Patch(':id')
  patch(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: PatchAlertDto) {
    return this.svc.patch(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.svc.remove(user.id, id);
  }
}
