import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { BaseDataModule } from './modules/base-data/base-data.module';
import { ClassroomRequestsModule } from './modules/classroom-requests/classroom-requests.module';
import { ClassroomsModule } from './modules/classrooms/classrooms.module';
import { ExamsModule } from './modules/exams/exams.module';
import { GraduationModule } from './modules/graduation/graduation.module';
import { ScheduleChangesModule } from './modules/schedule-changes/schedule-changes.module';
import { StudentsModule } from './modules/students/students.module';
import { TeachingLogsModule } from './modules/teaching-logs/teaching-logs.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { TextbooksModule } from './modules/textbooks/textbooks.module';
import { DatabaseModule } from './database/database.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ApiResponseInterceptor } from './common/interceptors/api-response.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    BaseDataModule,
    TeachersModule,
    StudentsModule,
    ClassroomsModule,
    ClassroomRequestsModule,
    ScheduleChangesModule,
    ExamsModule,
    TextbooksModule,
    GraduationModule,
    TeachingLogsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ApiResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
