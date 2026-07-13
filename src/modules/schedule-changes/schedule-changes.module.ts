import { Module } from '@nestjs/common';
import { ScheduleChangesController } from './schedule-changes.controller';
import { ScheduleChangesService } from './schedule-changes.service';

@Module({
  controllers: [ScheduleChangesController],
  providers: [ScheduleChangesService],
})
export class ScheduleChangesModule {}
