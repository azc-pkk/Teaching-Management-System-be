import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApprovalAction,
  ClassroomStatus,
  Prisma,
  UserRole,
  WorkflowStatus,
} from '../../../generated/prisma/client';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateClassroomRequestDto,
  QueryClassroomRequestDto,
  UpdateClassroomRequestDto,
  UpdateClassroomRequestStatusDto,
} from './dto/classroom-request.dto';

const BUSINESS_TYPE = 'CLASSROOM_REQUEST';
const ACTIVE_STATUSES = [
  WorkflowStatus.DRAFT,
  WorkflowStatus.PENDING,
  WorkflowStatus.APPROVED,
];

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
      list: await this.toClassroomRequestDtos(requests),
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

    return (await this.toClassroomRequestDtos([request]))[0];
  }

  async create(createDto: CreateClassroomRequestDto, actor: AuthenticatedUser) {
    this.ensureApplicantRole(actor);
    if (createDto.applicantId && createDto.applicantId !== actor.id) {
      throw new ForbiddenException({
        code: 'APPLICANT_MISMATCH',
        message: 'applicantId must match the authenticated user id',
      });
    }

    const status = createDto.status ?? WorkflowStatus.DRAFT;
    if (status !== WorkflowStatus.DRAFT && status !== WorkflowStatus.PENDING) {
      throw new BadRequestException({
        code: 'INVALID_STATUS_TRANSITION',
        message: 'A request can only be created as DRAFT or PENDING',
      });
    }

    const startTime = new Date(createDto.startTime);
    const endTime = new Date(createDto.endTime);
    this.ensureValidTimeRange(startTime, endTime);
    this.ensureApplicationTimePolicy(startTime, actor.role);
    await this.ensureClassroomCanHost(
      createDto.classroomId,
      createDto.participantCount,
    );
    await Promise.all([
      this.ensureClassroomAvailable(createDto.classroomId, startTime, endTime),
      this.ensureApplicantAvailable(actor.id, startTime, endTime),
    ]);

    const request = await this.prisma.$transaction(async (tx) => {
      const created = await tx.classroomRequest.create({
        data: {
          applicantId: actor.id,
          classroomId: createDto.classroomId,
          participantCount: createDto.participantCount,
          startTime,
          endTime,
          purpose: createDto.purpose.trim(),
          status,
        },
        include: this.includeRelations(),
      });

      if (status === WorkflowStatus.PENDING) {
        await tx.approvalRecord.create({
          data: {
            businessType: BUSINESS_TYPE,
            businessId: created.id,
            operatorId: actor.id,
            action: ApprovalAction.SUBMIT,
          },
        });
      }

      return created;
    });

    return (await this.toClassroomRequestDtos([request]))[0];
  }

  async update(
    id: number,
    updateDto: UpdateClassroomRequestDto,
    actor: AuthenticatedUser,
  ) {
    const current = await this.ensureRequestExists(id);
    this.ensureOwner(current.applicantId, actor);
    if (current.status !== WorkflowStatus.DRAFT) {
      throw new ConflictException({
        code: 'REQUEST_NOT_EDITABLE',
        message: 'Only DRAFT requests can be edited',
      });
    }

    const classroomId = updateDto.classroomId ?? current.classroomId;
    const participantCount =
      updateDto.participantCount ?? current.participantCount;
    const startTime = updateDto.startTime
      ? new Date(updateDto.startTime)
      : current.startTime;
    const endTime = updateDto.endTime
      ? new Date(updateDto.endTime)
      : current.endTime;

    this.ensureValidTimeRange(startTime, endTime);
    this.ensureApplicationTimePolicy(startTime, actor.role);
    await this.ensureClassroomCanHost(classroomId, participantCount);
    await Promise.all([
      this.ensureClassroomAvailable(classroomId, startTime, endTime, id),
      this.ensureApplicantAvailable(actor.id, startTime, endTime, id),
    ]);

    const request = await this.prisma.classroomRequest.update({
      where: { id },
      data: {
        classroomId: updateDto.classroomId,
        participantCount: updateDto.participantCount,
        startTime: updateDto.startTime ? startTime : undefined,
        endTime: updateDto.endTime ? endTime : undefined,
        purpose: updateDto.purpose?.trim(),
      },
      include: this.includeRelations(),
    });

    return (await this.toClassroomRequestDtos([request]))[0];
  }

  async updateStatus(
    id: number,
    updateDto: UpdateClassroomRequestStatusDto,
    actor: AuthenticatedUser,
  ) {
    const current = await this.ensureRequestExists(id);
    this.ensureStatusTransition(current, updateDto, actor);

    if (
      updateDto.status === WorkflowStatus.PENDING ||
      updateDto.status === WorkflowStatus.APPROVED
    ) {
      await this.ensureClassroomCanHost(
        current.classroomId,
        current.participantCount,
      );
      await Promise.all([
        this.ensureClassroomAvailable(
          current.classroomId,
          current.startTime,
          current.endTime,
          id,
        ),
        this.ensureApplicantAvailable(
          current.applicantId,
          current.startTime,
          current.endTime,
          id,
        ),
      ]);
    }

    const comment = updateDto.comment?.trim();
    const request = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.classroomRequest.update({
        where: { id },
        data: { status: updateDto.status },
        include: this.includeRelations(),
      });

      await tx.approvalRecord.create({
        data: {
          businessType: BUSINESS_TYPE,
          businessId: id,
          operatorId: actor.id,
          action: this.toApprovalAction(updateDto.status),
          comment: comment || undefined,
        },
      });

      return updated;
    });

    return (await this.toClassroomRequestDtos([request]))[0];
  }

  async remove(id: number, actor: AuthenticatedUser) {
    const request = await this.ensureRequestExists(id);
    this.ensureOwner(request.applicantId, actor);
    if (request.status !== WorkflowStatus.DRAFT) {
      throw new ConflictException({
        code: 'REQUEST_NOT_DELETABLE',
        message: 'Only DRAFT requests can be deleted',
      });
    }

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
      throw new BadRequestException({
        code: 'INVALID_TIME_RANGE',
        message: 'End time must be later than start time',
      });
    }
    if (startTime <= new Date()) {
      throw new BadRequestException({
        code: 'PAST_START_TIME',
        message: 'Start time must be in the future',
      });
    }
  }

  private ensureApplicationTimePolicy(startTime: Date, role: UserRole) {
    if (role !== UserRole.TEACHER && role !== UserRole.STUDENT) {
      return;
    }

    const latestStartTime = Date.now() + 7 * 24 * 60 * 60 * 1000;
    if (startTime.getTime() > latestStartTime) {
      throw new BadRequestException({
        code: 'ADVANCE_LIMIT_EXCEEDED',
        message: 'Teachers and students can apply at most 7 days in advance',
      });
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
          status: { in: ACTIVE_STATUSES },
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      }),
    ]);

    if (examCount + requestCount > 0) {
      throw new ConflictException({
        code: 'CLASSROOM_TIME_CONFLICT',
        message: 'Classroom is unavailable for this time',
      });
    }
  }

  private async ensureApplicantAvailable(
    applicantId: number,
    startTime: Date,
    endTime: Date,
    excludeRequestId?: number,
  ) {
    const count = await this.prisma.classroomRequest.count({
      where: {
        id: excludeRequestId ? { not: excludeRequestId } : undefined,
        applicantId,
        status: { in: ACTIVE_STATUSES },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });

    if (count > 0) {
      throw new ConflictException({
        code: 'APPLICANT_TIME_CONFLICT',
        message: 'The applicant already has an overlapping request',
      });
    }
  }

  private async ensureRequestExists(id: number) {
    const request = await this.prisma.classroomRequest.findUnique({
      where: { id },
      select: {
        id: true,
        applicantId: true,
        classroomId: true,
        participantCount: true,
        startTime: true,
        endTime: true,
        status: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Classroom request not found');
    }
    return request;
  }

  private async ensureClassroomCanHost(
    classroomId: number,
    participantCount: number,
  ) {
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
      select: { id: true, status: true, capacity: true },
    });

    if (!classroom) {
      throw new BadRequestException('Classroom not found');
    }
    if (classroom.status !== ClassroomStatus.AVAILABLE) {
      throw new ConflictException({
        code: 'CLASSROOM_NOT_AVAILABLE',
        message: 'Only AVAILABLE classrooms can be requested',
      });
    }
    if (participantCount > classroom.capacity) {
      throw new BadRequestException({
        code: 'CAPACITY_EXCEEDED',
        message: 'participantCount cannot exceed classroom capacity',
      });
    }
  }

  private ensureApplicantRole(actor: AuthenticatedUser) {
    if (
      actor.role !== UserRole.TEACHER &&
      actor.role !== UserRole.STUDENT &&
      actor.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException({
        code: 'APPLICANT_ROLE_FORBIDDEN',
        message: 'Only teachers and students can create classroom requests',
      });
    }
  }

  private ensureOwner(applicantId: number, actor: AuthenticatedUser) {
    if (actor.role === UserRole.ADMIN) {
      return;
    }

    if (applicantId !== actor.id) {
      throw new ForbiddenException({
        code: 'REQUEST_OWNER_REQUIRED',
        message: 'Only the applicant can perform this action',
      });
    }
  }

  private ensureStatusTransition(
    current: {
      applicantId: number;
      startTime: Date;
      status: WorkflowStatus;
    },
    updateDto: UpdateClassroomRequestStatusDto,
    actor: AuthenticatedUser,
  ) {
    const target = updateDto.status;

    if (
      (target === WorkflowStatus.PENDING ||
        target === WorkflowStatus.APPROVED) &&
      current.startTime <= new Date()
    ) {
      throw new ConflictException({
        code: 'REQUEST_ALREADY_STARTED',
        message: 'A started request cannot be submitted or approved',
      });
    }

    if (
      current.status === WorkflowStatus.DRAFT &&
      target === WorkflowStatus.PENDING
    ) {
      this.ensureOwner(current.applicantId, actor);
      return;
    }

    if (
      current.status === WorkflowStatus.PENDING &&
      (target === WorkflowStatus.APPROVED || target === WorkflowStatus.REJECTED)
    ) {
      if (actor.role !== UserRole.ACADEMIC && actor.role !== UserRole.ADMIN) {
        throw new ForbiddenException({
          code: 'APPROVAL_FORBIDDEN',
          message:
            'Only academic or system administrators can approve or reject requests',
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

    if (
      current.status === WorkflowStatus.PENDING &&
      target === WorkflowStatus.CANCELLED
    ) {
      this.ensureOwner(current.applicantId, actor);
      if (current.startTime <= new Date()) {
        throw new ConflictException({
          code: 'REQUEST_ALREADY_STARTED',
          message: 'A started request cannot be cancelled',
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
      applicant: {
        select: { id: true, username: true, name: true, role: true },
      },
      classroom: {
        select: {
          id: true,
          campus: true,
          building: true,
          roomNo: true,
          type: true,
          capacity: true,
          status: true,
        },
      },
    };
  }

  private async toClassroomRequestDtos(requests: ClassroomRequestResult[]) {
    if (requests.length === 0) {
      return [];
    }

    const approvals = await this.prisma.approvalRecord.findMany({
      where: {
        businessType: BUSINESS_TYPE,
        businessId: { in: requests.map((request) => request.id) },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      include: {
        operator: {
          select: { id: true, username: true, name: true, role: true },
        },
      },
    });
    const approvalsByRequest = new Map<number, ApprovalResult[]>();

    for (const approval of approvals) {
      const history = approvalsByRequest.get(approval.businessId) ?? [];
      history.push(approval);
      approvalsByRequest.set(approval.businessId, history);
    }

    return requests.map((request) => {
      const history = (approvalsByRequest.get(request.id) ?? []).map(
        (approval) => ({
          id: approval.id,
          action: approval.action,
          comment: approval.comment,
          operator: {
            id: approval.operator.id,
            username: approval.operator.username,
            name: approval.operator.name,
            role: approval.operator.role.toLowerCase(),
          },
          createdAt: approval.createdAt.toISOString(),
        }),
      );

      return {
        id: request.id,
        applicantId: request.applicantId,
        applicant: {
          id: request.applicant.id,
          username: request.applicant.username,
          name: request.applicant.name,
          role: request.applicant.role.toLowerCase(),
        },
        applicantName: request.applicant.name,
        applicantUsername: request.applicant.username,
        classroomId: request.classroomId,
        classroomRoomNo: request.classroom.roomNo,
        classroomCampus: request.classroom.campus,
        classroomBuilding: request.classroom.building,
        classroomType: request.classroom.type,
        classroomCapacity: request.classroom.capacity,
        classroomStatus: request.classroom.status,
        participantCount: request.participantCount,
        startTime: request.startTime.toISOString(),
        endTime: request.endTime.toISOString(),
        purpose: request.purpose,
        status: request.status,
        latestApproval: history.at(-1) ?? null,
        approvalHistory: history,
      };
    });
  }
}

type ClassroomRequestResult = {
  id: number;
  applicantId: number;
  applicant: {
    id: number;
    username: string;
    name: string;
    role: UserRole;
  };
  classroomId: number;
  classroom: {
    id: number;
    campus: string | null;
    building: string | null;
    roomNo: string;
    type: string | null;
    capacity: number;
    status: ClassroomStatus;
  };
  participantCount: number;
  startTime: Date;
  endTime: Date;
  purpose: string;
  status: WorkflowStatus;
};

type ApprovalResult = {
  id: number;
  businessId: number;
  action: ApprovalAction;
  comment: string | null;
  createdAt: Date;
  operator: {
    id: number;
    username: string;
    name: string;
    role: UserRole;
  };
};
