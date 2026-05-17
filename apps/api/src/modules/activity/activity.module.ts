import { Global, Module } from '@nestjs/common';
import { ActivityService } from './activity.service';

// Global so every feature module can inject ActivityService without
// having to import this module explicitly.
@Global()
@Module({
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
