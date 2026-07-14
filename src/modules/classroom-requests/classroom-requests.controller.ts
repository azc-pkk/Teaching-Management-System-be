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
import { ClassroomRequestsService } from './classroom-requests.service';
import {
  CreateClassroomRequestDto,
  QueryClassroomRequestDto,
  UpdateClassroomRequestDto,
  UpdateClassroomRequestStatusDto,
} from './dto/classroom-request.dto';

@Controller('classroom-requests')
@UseGuards(JwtAuthGuard)
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
  create(
    @Body() createDto: CreateClassroomRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.classroomRequestsService.create(createDto, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateClassroomRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.classroomRequestsService.update(id, updateDto, user);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateClassroomRequestStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.classroomRequestsService.updateStatus(
      id,
      updateStatusDto,
      user,
    );
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.classroomRequestsService.remove(id, user);
  }
}
