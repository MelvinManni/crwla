import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { QueuesModule } from '../queues/queues.module';

@Module({
  imports: [QueuesModule],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class TasksModule {}
