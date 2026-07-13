import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApprovalAction,
  Prisma,
  WorkflowStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateClassroomRequestDto,
  QueryClassroomRequestDto,
  UpdateClassroomRequestDto,
  UpdateClassroomRequestStatusDto,
} from './dto/classroom-request.dto';

@Injectable()
export class ClassroomRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryClassroomRequestDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const keyword = query.keyword?.trim();
    const where: Prisma.ClassroomRequestWhereInput = {
      applicantId: query.applicantId,
      classroomId: query.classroomId,
      status: query.status,
      startTime: this.buildDateRange(query.startTimeFrom, query.startTimeTo),
      OR: keyword
        ? [
            { purpose: { contains: keyword } },
            { classroom: { roomNo: { contains: keyword } } },
            { applicant: { username: { contains: keyword } } },
            { applicant: { name: { contains: keyword } } },
          ]
        : undefined,
    };

    const [requests, total] = await this.prisma.$transaction([
      this.prisma.classroomRequest.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { startTime: 'desc' },
        include: this.includeRelations(),
      }),
      this.prisma.classroomRequest.count({ where }),
    ]);

    return {
      list: requests.map((request) => this.toClassroomRequestDto(request)),
      page,
      pageSize,
      total,
    };
  }

  async findOne(id: number) {
    const request = await this.prisma.classroomRequest.findUnique({
      where: { id },
      include: this.includeRelations(),
    });

    if (!request) {
      throw new NotFoundException('Classroom request not found');
    }

    return this.toClassroomRequestDto(request);
  }

  async create(createDto: CreateClassroomRequestDto) {
    const startTime = new Date(createDto.startTime);
    const endTime = new Date(createDto.endTime);

    this.ensureValidTimeRange(startTime, endTime);
    await Promise.all([
      this.ensureApplicantExists(createDto.applicantId),
      this.ensureClassroomExists(createDto.classroomId),
    ]);
    await this.ensureClassroomAvailable(
      createDto.classroomId,
      startTime,
      endTime,
    );

    const request = await this.prisma.classroomRequest.create({
      data: {
        applicantId: createDto.applicantId,
        classroomId: createDto.classroomId,
        startTime,
        endTime,
        purpose: createDto.purpose,
        status: createDto.status ?? WorkflowStatus.PENDING,
      },
      include: this.includeRelations(),
    });

    return this.toClassroomRequestDto(request);
  }

  async update(id: number, updateDto: UpdateClassroomRequestDto) {
    const current = await this.ensureRequestExists(id);
    const classroomId = updateDto.classroomId ?? current.classroomId;
    const startTime = updateDto.startTime
      ? new Date(updateDto.startTime)
      : current.startTime;
    const endTime = updateDto.endTime
      ? new Date(updateDto.endTime)
      : current.endTime;

    this.ensureValidTimeRange(startTime, endTime);
    await Promise.all([
      this.ensureApplicantExists(updateDto.applicantId),
      this.ensureClassroomExists(updateDto.classroomId),
    ]);
    await this.ensureClassroomAvailable(classroomId, startTime, endTime, id);

    const request = await this.prisma.classroomRequest.update({
      where: { id },
      data: {
        applicantId: updateDto.applicantId,
        classroomId: updateDto.classroomId,
        startTime: updateDto.startTime ? startTime : undefined,
        endTime: updateDto.endTime ? endTime : undefined,
        purpose: updateDto.purpose,
        status: updateDto.status,
      },
      include: this.includeRelations(),
    });

    return this.toClassroomRequestDto(request);
  }

  async updateStatus(id: number, updateDto: UpdateClassroomRequestStatusDto) {
    const current = await this.ensureRequestExists(id);
    await this.ensureOperatorExists(updateDto.operatorId);

    if (
      updateDto.status === WorkflowStatus.PENDING ||
      updateDto.status === WorkflowStatus.APPROVED
    ) {
      await this.ensureClassroomAvailable(
        current.classroomId,
        current.startTime,
        current.endTime,
        id,
      );
    }

    const request = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.classroomRequest.update({
        where: { id },
        data: { status: updateDto.status },
        include: this.includeRelations(),
      });

      if (updateDto.operatorId) {
        await tx.approvalRecord.create({
          data: {
            businessType: 'CLASSROOM_REQUEST',
            businessId: id,
            operatorId: updateDto.operatorId,
            action: this.toApprovalAction(updateDto.status),
            comment: updateDto.comment,
          },
        });
      }

      return updated;
    });

    return this.toClassroomRequestDto(request);
  }

  async remove(id: number) {
    await this.ensureRequestExists(id);
    await this.prisma.classroomRequest.delete({ where: { id } });

    return { deleted: true };
  }

  private buildDateRange(startTimeFrom?: string, startTimeTo?: string) {
    if (!startTimeFrom && !startTimeTo) {
      return undefined;
    }

    return {
      gte: startTimeFrom ? new Date(startTimeFrom) : undefined,
      lte: startTimeTo ? new Date(startTimeTo) : undefined,
    };
  }

  private ensureValidTimeRange(startTime: Date, endTime: Date) {
    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      throw new BadRequestException('Invalid time');
    }

    if (startTime >= endTime) {
      throw new BadRequestException('End time must be later than start time');
    }
  }

  private async ensureClassroomAvailable(
    classroomId: number,
    startTime: Date,
    endTime: Date,
    excludeRequestId?: number,
  ) {
    const [examCount, requestCount] = await this.prisma.$transaction([
      this.prisma.exam.count({
        where: {
          classroomId,
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      }),
      this.prisma.classroomRequest.count({
        where: {
          id: excludeRequestId ? { not: excludeRequestId } : undefined,
          classroomId,
          status: { in: [WorkflowStatus.PENDING, WorkflowStatus.APPROVED] },
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      }),
    ]);

    if (examCount + requestCount > 0) {
      throw new ConflictException('Classroom is unavailable for this time');
    }
  }

  private async ensureRequestExists(id: number) {
    const request = await this.prisma.classroomRequest.findUnique({
      where: { id },
      select: {
        id: true,
        applicantId: true,
        classroomId: true,
        startTime: true,
        endTime: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Classroom request not found');
    }

    return request;
  }

  private async ensureApplicantExists(applicantId?: number) {
    if (!applicantId) {
      return;
    }

    const applicant = await this.prisma.user.findUnique({
      where: { id: applicantId },
      select: { id: true },
    });

    if (!applicant) {
      throw new BadRequestException('Applicant not found');
    }
  }

  private async ensureOperatorExists(operatorId?: number) {
    if (!operatorId) {
      return;
    }

    const operator = await this.prisma.user.findUnique({
      where: { id: operatorId },
      select: { id: true },
    });

    if (!operator) {
      throw new BadRequestException('Operator not found');
    }
  }

  private async ensureClassroomExists(classroomId?: number) {
    if (!classroomId) {
      return;
    }

    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
      select: { id: true },
    });

    if (!classroom) {
      throw new BadRequestException('Classroom not found');
    }
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
      applicant: { select: { id: true, username: true, name: true } },
      classroom: {
        select: {
          id: true,
          campus: true,
          building: true,
          roomNo: true,
          type: true,
          capacity: true,
        },
      },
    };
  }

  private toClassroomRequestDto(request: {
    id: number;
    applicantId: number;
    applicant: { id: number; username: string; name: string };
    classroomId: number;
    classroom: {
      id: number;
      campus: string | null;
      building: string | null;
      roomNo: string;
      type: string | null;
      capacity: number;
    };
    startTime: Date;
    endTime: Date;
    purpose: string;
    status: string;
  }) {
    return {
      id: request.id,
      applicantId: request.applicantId,
      applicantName: request.applicant.name,
      applicantUsername: request.applicant.username,
      classroomId: request.classroomId,
      classroomRoomNo: request.classroom.roomNo,
      classroomCampus: request.classroom.campus,
      classroomBuilding: request.classroom.building,
      classroomType: request.classroom.type,
      classroomCapacity: request.classroom.capacity,
      startTime: request.startTime.toISOString(),
      endTime: request.endTime.toISOString(),
      purpose: request.purpose,
      status: request.status,
    };
  }
}
