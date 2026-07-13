import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ClassroomRequestsService } from './classroom-requests.service';
import {
  CreateClassroomRequestDto,
  QueryClassroomRequestDto,
  UpdateClassroomRequestDto,
  UpdateClassroomRequestStatusDto,
} from './dto/classroom-request.dto';

@Controller('classroom-requests')
export class ClassroomRequestsController {
  constructor(
    private readonly classroomRequestsService: ClassroomRequestsService,
  ) {}

  @Get()
  findAll(@Query() query: QueryClassroomRequestDto) {
    return this.classroomRequestsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.classroomRequestsService.findOne(id);
  }

  @Post()
  create(@Body() createDto: CreateClassroomRequestDto) {
    return this.classroomRequestsService.create(createDto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateClassroomRequestDto,
  ) {
    return this.classroomRequestsService.update(id, updateDto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateClassroomRequestStatusDto,
  ) {
    return this.classroomRequestsService.updateStatus(id, updateStatusDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.classroomRequestsService.remove(id);
  }
}
