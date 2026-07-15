import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApprovalAction,
  Prisma,
  UserRole,
  WorkflowStatus,
} from '../../../generated/prisma/client';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateScheduleChangeDto,
  QueryScheduleChangeDto,
  UpdateScheduleChangeDto,
  UpdateScheduleChangeStatusDto,
} from './dto/schedule-change.dto';

@Injectable()
export class ScheduleChangesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryScheduleChangeDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const keyword = query.keyword?.trim();
    const where: Prisma.ScheduleChangeWhereInput = {
      teacherId: query.teacherId,
      courseId: query.courseId,
      classGroupId: query.classGroupId,
      status: query.status,
      OR: keyword
        ? [
            { reason: { contains: keyword } },
            { teacher: { name: { contains: keyword } } },
            { teacher: { employeeNo: { contains: keyword } } },
            { course: { name: { contains: keyword } } },
            { course: { code: { contains: keyword } } },
            { classGroup: { name: { contains: keyword } } },
          ]
        : undefined,
    };

    const [changes, total] = await this.prisma.$transaction([
      this.prisma.scheduleChange.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: 'desc' },
        include: this.includeRelations(),
      }),
      this.prisma.scheduleChange.count({ where }),
    ]);

    return {
      list: changes.map((change) => this.toScheduleChangeDto(change)),
      page,
      pageSize,
      total,
    };
  }

  async findOne(id: number) {
    const change = await this.prisma.scheduleChange.findUnique({
      where: { id },
      include: this.includeRelations(),
    });

    if (!change) {
      throw new NotFoundException('Schedule change not found');
    }

    return this.toScheduleChangeDto(change);
  }

  async create(createDto: CreateScheduleChangeDto, actor: AuthenticatedUser) {
    this.ensureTeacherActor(actor, createDto.teacherId);
    if (
      createDto.status !== undefined &&
      createDto.status !== WorkflowStatus.DRAFT &&
      createDto.status !== WorkflowStatus.PENDING
    ) {
      throw new BadRequestException({
        code: 'INVALID_STATUS_TRANSITION',
        message: 'A schedule change can only be created as DRAFT or PENDING',
      });
    }
    await this.ensureRelationsExist(
      createDto.teacherId,
      createDto.courseId,
      createDto.classGroupId,
    );

    const change = await this.prisma.scheduleChange.create({
      data: {
        teacherId: createDto.teacherId,
        courseId: createDto.courseId,
        classGroupId: createDto.classGroupId,
        hours: createDto.hours,
        reason: createDto.reason,
        status: createDto.status ?? WorkflowStatus.PENDING,
      },
      include: this.includeRelations(),
    });

    return this.toScheduleChangeDto(change);
  }

  async update(
    id: number,
    updateDto: UpdateScheduleChangeDto,
    actor: AuthenticatedUser,
  ) {
    const current = await this.ensureChangeExists(id);
    this.ensureTeacherActor(actor, current.teacherId);
    if (
      current.status !== WorkflowStatus.DRAFT &&
      current.status !== WorkflowStatus.PENDING
    ) {
      throw new ConflictException({
        code: 'SCHEDULE_CHANGE_NOT_EDITABLE',
        message: 'Only DRAFT or PENDING schedule changes can be edited',
      });
    }
    if (updateDto.status !== undefined) {
      throw new BadRequestException({
        code: 'STATUS_ENDPOINT_REQUIRED',
        message: 'Use the status endpoint to change workflow status',
      });
    }
    if (
      updateDto.teacherId !== undefined &&
      updateDto.teacherId !== current.teacherId
    ) {
      throw new ForbiddenException({
        code: 'TEACHER_MISMATCH',
        message:
          'A teacher cannot transfer a schedule change to another teacher',
      });
    }
    await this.ensureRelationsExist(
      updateDto.teacherId,
      updateDto.courseId,
      updateDto.classGroupId,
    );

    const change = await this.prisma.scheduleChange.update({
      where: { id },
      data: {
        courseId: updateDto.courseId,
        classGroupId: updateDto.classGroupId,
        hours: updateDto.hours,
        reason: updateDto.reason,
      },
      include: this.includeRelations(),
    });

    return this.toScheduleChangeDto(change);
  }

  async updateStatus(
    id: number,
    updateDto: UpdateScheduleChangeStatusDto,
    actor: AuthenticatedUser,
  ) {
    const current = await this.ensureChangeExists(id);
    this.ensureStatusTransition(current, updateDto, actor);
    const comment = updateDto.comment?.trim();

    const change = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.scheduleChange.update({
        where: { id },
        data: { status: updateDto.status },
        include: this.includeRelations(),
      });

      await tx.approvalRecord.create({
        data: {
          businessType: 'SCHEDULE_CHANGE',
          businessId: id,
          operatorId: actor.id,
          action: this.toApprovalAction(updateDto.status),
          comment: comment || undefined,
        },
      });

      return updated;
    });

    return this.toScheduleChangeDto(change);
  }

  async remove(id: number, actor: AuthenticatedUser) {
    const current = await this.ensureChangeExists(id);
    this.ensureTeacherActor(actor, current.teacherId);
    if (current.status !== WorkflowStatus.DRAFT) {
      throw new ConflictException({
        code: 'SCHEDULE_CHANGE_NOT_DELETABLE',
        message: 'Only DRAFT schedule changes can be deleted',
      });
    }
    await this.prisma.scheduleChange.delete({ where: { id } });

    return { deleted: true };
  }

  private async ensureRelationsExist(
    teacherId?: number,
    courseId?: number,
    classGroupId?: number,
  ) {
    const [teacher, course, classGroup] = await Promise.all([
      teacherId
        ? this.prisma.teacher.findUnique({
            where: { id: teacherId },
            select: { id: true },
          })
        : Promise.resolve({ id: 0 }),
      courseId
        ? this.prisma.course.findUnique({
            where: { id: courseId },
            select: { id: true },
          })
        : Promise.resolve({ id: 0 }),
      classGroupId
        ? this.prisma.classGroup.findUnique({
            where: { id: classGroupId },
            select: { id: true },
          })
        : Promise.resolve({ id: 0 }),
    ]);

    if (teacherId && !teacher) {
      throw new BadRequestException('Teacher not found');
    }
    if (courseId && !course) {
      throw new BadRequestException('Course not found');
    }
    if (classGroupId && !classGroup) {
      throw new BadRequestException('Class group not found');
    }
  }

  private async ensureChangeExists(id: number) {
    const change = await this.prisma.scheduleChange.findUnique({
      where: { id },
      select: { id: true, teacherId: true, status: true },
    });

    if (!change) {
      throw new NotFoundException('Schedule change not found');
    }

    return change;
  }

  private ensureTeacherActor(actor: AuthenticatedUser, teacherId: number) {
    if (actor.role === UserRole.ADMIN) {
      return;
    }

    if (actor.role !== UserRole.TEACHER || actor.teacherId !== teacherId) {
      throw new ForbiddenException({
        code: 'SCHEDULE_CHANGE_OWNER_REQUIRED',
        message:
          'Only the teacher who owns the schedule change can perform this action',
      });
    }
  }

  private ensureStatusTransition(
    current: { teacherId: number; status: WorkflowStatus },
    updateDto: UpdateScheduleChangeStatusDto,
    actor: AuthenticatedUser,
  ) {
    const target = updateDto.status;
    if (
      current.status === WorkflowStatus.DRAFT &&
      target === WorkflowStatus.PENDING
    ) {
      this.ensureTeacherActor(actor, current.teacherId);
      return;
    }

    if (
      current.status === WorkflowStatus.PENDING &&
      target === WorkflowStatus.CANCELLED
    ) {
      this.ensureTeacherActor(actor, current.teacherId);
      return;
    }

    if (
      current.status === WorkflowStatus.PENDING &&
      (target === WorkflowStatus.APPROVED || target === WorkflowStatus.REJECTED)
    ) {
      if (
        actor.role !== UserRole.DEPARTMENT_ADMIN &&
        actor.role !== UserRole.ACADEMIC &&
        actor.role !== UserRole.ADMIN
      ) {
        throw new ForbiddenException({
          code: 'SCHEDULE_CHANGE_APPROVAL_FORBIDDEN',
          message:
            'Only department, academic, or system administrators can approve or reject schedule changes',
        });
      }
      if (target === WorkflowStatus.REJECTED && !updateDto.comment?.trim()) {
        throw new BadRequestException({
          code: 'REJECTION_COMMENT_REQUIRED',
          message: 'comment is required when rejecting',
        });
      }
      return;
    }

    throw new ConflictException({
      code: 'INVALID_STATUS_TRANSITION',
      message: `Invalid status transition: ${current.status} -> ${target}`,
    });
  }

  private toApprovalAction(status: WorkflowStatus) {
    const actions: Partial<Record<WorkflowStatus, ApprovalAction>> = {
      [WorkflowStatus.PENDING]: ApprovalAction.SUBMIT,
      [WorkflowStatus.APPROVED]: ApprovalAction.APPROVE,
      [WorkflowStatus.REJECTED]: ApprovalAction.REJECT,
      [WorkflowStatus.CANCELLED]: ApprovalAction.CANCEL,
    };

    return actions[status] ?? ApprovalAction.RETURN;
  }

  private includeRelations() {
    return {
      teacher: { select: { id: true, employeeNo: true, name: true } },
      course: { select: { id: true, code: true, name: true } },
      classGroup: { select: { id: true, name: true, grade: true } },
    } as const;
  }

  private toScheduleChangeDto(change: {
    id: number;
    teacherId: number;
    teacher: { id: number; employeeNo: string; name: string };
    courseId: number;
    course: { id: number; code: string; name: string };
    classGroupId: number;
    classGroup: { id: number; name: string; grade: number };
    hours: { toNumber(): number } | number;
    reason: string;
    status: string;
  }) {
    return {
      id: change.id,
      teacherId: change.teacherId,
      teacherName: change.teacher.name,
      teacherEmployeeNo: change.teacher.employeeNo,
      courseId: change.courseId,
      courseCode: change.course.code,
      courseName: change.course.name,
      classGroupId: change.classGroupId,
      classGroupName: change.classGroup.name,
      classGroupGrade: change.classGroup.grade,
      hours:
        typeof change.hours === 'number'
          ? change.hours
          : change.hours.toNumber(),
      reason: change.reason,
      status: change.status,
    };
  }
}
