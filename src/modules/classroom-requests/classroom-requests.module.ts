import { Module } from '@nestjs/common';
import { ClassroomRequestsController } from './classroom-requests.controller';
import { ClassroomRequestsService } from './classroom-requests.service';

@Module({
  controllers: [ClassroomRequestsController],
  providers: [ClassroomRequestsService],
})
export class ClassroomRequestsModule {}
