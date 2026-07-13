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
import {
  CreateScheduleChangeDto,
  QueryScheduleChangeDto,
  UpdateScheduleChangeDto,
  UpdateScheduleChangeStatusDto,
} from './dto/schedule-change.dto';
import { ScheduleChangesService } from './schedule-changes.service';

@Controller('schedule-changes')
export class ScheduleChangesController {
  constructor(
    private readonly scheduleChangesService: ScheduleChangesService,
  ) {}

  @Get()
  findAll(@Query() query: QueryScheduleChangeDto) {
    return this.scheduleChangesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.scheduleChangesService.findOne(id);
  }

  @Post()
  create(@Body() createDto: CreateScheduleChangeDto) {
    return this.scheduleChangesService.create(createDto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateScheduleChangeDto,
  ) {
    return this.scheduleChangesService.update(id, updateDto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateScheduleChangeStatusDto,
  ) {
    return this.scheduleChangesService.updateStatus(id, updateStatusDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.scheduleChangesService.remove(id);
  }
}
