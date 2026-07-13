import { Controller, Get, Query } from '@nestjs/common';
import { BaseDataService } from './base-data.service';
import {
  ClassGroupQueryDto,
  ClassroomQueryDto,
  CourseQueryDto,
  DepartmentQueryDto,
  MajorQueryDto,
} from './dto/base-data-query.dto';

@Controller('base-data')
export class BaseDataController {
  constructor(private readonly baseDataService: BaseDataService) {}

  @Get('departments')
  findDepartments(@Query() query: DepartmentQueryDto) {
    return this.baseDataService.findDepartments(query);
  }

  @Get('majors')
  findMajors(@Query() query: MajorQueryDto) {
    return this.baseDataService.findMajors(query);
  }

  @Get('class-groups')
  findClassGroups(@Query() query: ClassGroupQueryDto) {
    return this.baseDataService.findClassGroups(query);
  }

  @Get('courses')
  findCourses(@Query() query: CourseQueryDto) {
    return this.baseDataService.findCourses(query);
  }

  @Get('classrooms')
  findClassrooms(@Query() query: ClassroomQueryDto) {
    return this.baseDataService.findClassrooms(query);
  }
}
