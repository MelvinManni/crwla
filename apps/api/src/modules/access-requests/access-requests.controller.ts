import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AccessRequestsService } from './access-requests.service';

/**
 * @deprecated Part of the legacy admin-approval signup flow, superseded by
 * self-serve `POST /auth/signup`. Kept so admins can still process any
 * outstanding access requests; remove once none remain.
 */
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
