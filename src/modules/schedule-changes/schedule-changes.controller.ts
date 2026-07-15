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
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/auth/authenticated-user';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import {
  CreateScheduleChangeDto,
  QueryScheduleChangeDto,
  UpdateScheduleChangeDto,
  UpdateScheduleChangeStatusDto,
} from './dto/schedule-change.dto';
import { ScheduleChangesService } from './schedule-changes.service';

@Controller('schedule-changes')
@UseGuards(JwtAuthGuard)
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
  create(
    @Body() createDto: CreateScheduleChangeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.scheduleChangesService.create(createDto, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateScheduleChangeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.scheduleChangesService.update(id, updateDto, user);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateScheduleChangeStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.scheduleChangesService.updateStatus(id, updateStatusDto, user);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.scheduleChangesService.remove(id, user);
  }
}
