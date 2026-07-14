import { Module } from '@nestjs/common';
import { ClassroomRequestsController } from './classroom-requests.controller';
import { ClassroomRequestsService } from './classroom-requests.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';

@Module({
  controllers: [ClassroomRequestsController],
  providers: [ClassroomRequestsService, JwtAuthGuard],
})
export class ClassroomRequestsModule {}
