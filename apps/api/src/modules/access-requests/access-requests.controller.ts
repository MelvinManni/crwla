import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AccessRequestsService } from './access-requests.service';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/requests')
export class AccessRequestsController {
  constructor(private readonly svc: AccessRequestsService) {}

  @Get()
  list() {
    return this.svc.listPending().then((requests) => ({ requests }));
  }

  @Post(':id/approve')
  approve(@Param('id') id: string) {
    return this.svc.approve(id);
  }

  @Post(':id/deny')
  deny(@Param('id') id: string) {
    return this.svc.deny(id);
  }
}
