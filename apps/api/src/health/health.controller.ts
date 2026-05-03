import { Controller, Get } from '@nestjs/common';
import { SelfCheckService } from './self-check.service';

@Controller('health')
export class HealthController {
  constructor(private readonly selfCheck: SelfCheckService) {}

  @Get()
  async get() {
    const report = await this.selfCheck.run();
    return report;
  }
}
