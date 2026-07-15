import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  UserRole,
  WorkflowStatus,
} from '../../../generated/prisma/client';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { PrismaService } from '../../database/prisma.service';
import { CreateExamDto, QueryExamDto, UpdateExamDto } from './dto/exam.dto';

@Injectable()
export class ExamsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryExamDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const keyword = query.keyword?.trim();
    const where: Prisma.ExamWhereInput = {
      semesterId: query.semesterId,
      courseId: query.courseId,
      classGroupId: query.classGroupId,
      classroomId: query.classroomId,
      invigilatorId: query.invigilatorId,
      startTime: this.buildDateRange(query.startTimeFrom, query.startTimeTo),
      OR: keyword
        ? [
            { course: { name: { contains: keyword } } },
            { course: { code: { contains: keyword } } },
            { classGroup: { name: { contains: keyword } } },
            { classroom: { roomNo: { contains: keyword } } },
            { classroom: { building: { contains: keyword } } },
            { invigilator: { name: { contains: keyword } } },
            { invigilator: { employeeNo: { contains: keyword } } },
          ]
        : undefined,
    };

    const [exams, total] = await this.prisma.$transaction([
      this.prisma.exam.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { startTime: 'asc' },
        include: this.includeRelations(),
      }),
      this.prisma.exam.count({ where }),
    ]);

    return {
      list: exams.map((exam) => this.toExamDto(exam)),
      page,
      pageSize,
      total,
    };
  }

  async findOne(id: number) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: this.includeRelations(),
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    return this.toExamDto(exam);
  }

  async create(createDto: CreateExamDto, actor: AuthenticatedUser) {
    this.ensureAcademicActor(actor);
    const startTime = new Date(createDto.startTime);
    const endTime = new Date(createDto.endTime);

    this.ensureValidTimeRange(startTime, endTime);
    await this.ensureRelationsExist(
      createDto.semesterId,
      createDto.courseId,
      createDto.classGroupId,
      createDto.classroomId,
      createDto.invigilatorId,
    );
    await this.ensureNoConflicts({
      classroomId: createDto.classroomId,
      classGroupId: createDto.classGroupId,
      invigilatorId: createDto.invigilatorId,
      startTime,
      endTime,
    });

    const exam = await this.prisma.exam.create({
      data: {
        semesterId: createDto.semesterId,
        courseId: createDto.courseId,
        classGroupId: createDto.classGroupId,
        classroomId: createDto.classroomId,
        startTime,
        endTime,
        invigilatorId: createDto.invigilatorId,
      },
      include: this.includeRelations(),
    });

    return this.toExamDto(exam);
  }

  async update(id: number, updateDto: UpdateExamDto, actor: AuthenticatedUser) {
    this.ensureAcademicActor(actor);
    const current = await this.ensureExamExists(id);
    const classroomId = updateDto.classroomId ?? current.classroomId;
    const classGroupId = updateDto.classGroupId ?? current.classGroupId;
    const invigilatorId =
      updateDto.invigilatorId === undefined
        ? current.invigilatorId
        : updateDto.invigilatorId;
    const startTime = updateDto.startTime
      ? new Date(updateDto.startTime)
      : current.startTime;
    const endTime = updateDto.endTime
      ? new Date(updateDto.endTime)
      : current.endTime;

    this.ensureValidTimeRange(startTime, endTime);
    await this.ensureRelationsExist(
      updateDto.semesterId,
      updateDto.courseId,
      updateDto.classGroupId,
      updateDto.classroomId,
      updateDto.invigilatorId,
    );
    await this.ensureNoConflicts({
      classroomId,
      classGroupId,
      invigilatorId,
      startTime,
      endTime,
      excludeExamId: id,
    });

    const exam = await this.prisma.exam.update({
      where: { id },
      data: {
        semesterId: updateDto.semesterId,
        courseId: updateDto.courseId,
        classGroupId: updateDto.classGroupId,
        classroomId: updateDto.classroomId,
        startTime: updateDto.startTime ? startTime : undefined,
        endTime: updateDto.endTime ? endTime : undefined,
        invigilatorId: updateDto.invigilatorId,
      },
      include: this.includeRelations(),
    });

    return this.toExamDto(exam);
  }

  async remove(id: number, actor: AuthenticatedUser) {
    this.ensureAcademicActor(actor);
    await this.ensureExamExists(id);
    await this.prisma.exam.delete({ where: { id } });

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

  private ensureAcademicActor(actor: AuthenticatedUser) {
    if (actor.role !== UserRole.ACADEMIC && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException({
        code: 'EXAM_MANAGEMENT_FORBIDDEN',
        message: 'Only academic or system administrators can manage exams',
      });
    }
  }

  private ensureValidTimeRange(startTime: Date, endTime: Date) {
    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      throw new BadRequestException('Invalid time');
    }

    if (startTime >= endTime) {
      throw new BadRequestException('End time must be later than start time');
    }
  }

  private async ensureRelationsExist(
    semesterId?: number,
    courseId?: number,
    classGroupId?: number,
    classroomId?: number,
    invigilatorId?: number | null,
  ) {
    const [semester, course, classGroup, classroom, invigilator] =
      await Promise.all([
        semesterId
          ? this.prisma.semester.findUnique({
              where: { id: semesterId },
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
        classroomId
          ? this.prisma.classroom.findUnique({
              where: { id: classroomId },
              select: { id: true },
            })
          : Promise.resolve({ id: 0 }),
        invigilatorId
          ? this.prisma.teacher.findUnique({
              where: { id: invigilatorId },
              select: { id: true },
            })
          : Promise.resolve({ id: 0 }),
      ]);

    if (semesterId && !semester) {
      throw new BadRequestException('Semester not found');
    }
    if (courseId && !course) {
      throw new BadRequestException('Course not found');
    }
    if (classGroupId && !classGroup) {
      throw new BadRequestException('Class group not found');
    }
    if (classroomId && !classroom) {
      throw new BadRequestException('Classroom not found');
    }
    if (invigilatorId && !invigilator) {
      throw new BadRequestException('Invigilator not found');
    }
  }

  private async ensureNoConflicts(input: {
    classroomId: number;
    classGroupId: number;
    invigilatorId?: number | null;
    startTime: Date;
    endTime: Date;
    excludeExamId?: number;
  }) {
    const overlap: Prisma.ExamWhereInput = {
      id: input.excludeExamId ? { not: input.excludeExamId } : undefined,
      startTime: { lt: input.endTime },
      endTime: { gt: input.startTime },
    };
    const [classroomExam, classGroupExam, invigilatorExam, classroomRequest] =
      await Promise.all([
        this.prisma.exam.findFirst({
          where: { ...overlap, classroomId: input.classroomId },
          select: { id: true },
        }),
        this.prisma.exam.findFirst({
          where: { ...overlap, classGroupId: input.classGroupId },
          select: { id: true },
        }),
        input.invigilatorId
          ? this.prisma.exam.findFirst({
              where: { ...overlap, invigilatorId: input.invigilatorId },
              select: { id: true },
            })
          : Promise.resolve(null),
        this.prisma.classroomRequest.findFirst({
          where: {
            classroomId: input.classroomId,
            status: { in: [WorkflowStatus.PENDING, WorkflowStatus.APPROVED] },
            startTime: { lt: input.endTime },
            endTime: { gt: input.startTime },
          },
          select: { id: true },
        }),
      ]);

    if (classroomExam) {
      throw new ConflictException('Classroom has another exam at this time');
    }
    if (classGroupExam) {
      throw new ConflictException('Class group has another exam at this time');
    }
    if (invigilatorExam) {
      throw new ConflictException('Invigilator has another exam at this time');
    }
    if (classroomRequest) {
      throw new ConflictException(
        'Classroom has an active borrowing request at this time',
      );
    }
  }

  private async ensureExamExists(id: number) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      select: {
        id: true,
        classroomId: true,
        classGroupId: true,
        invigilatorId: true,
        startTime: true,
        endTime: true,
      },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    return exam;
  }

  private includeRelations() {
    return {
      course: { select: { id: true, code: true, name: true } },
      classGroup: { select: { id: true, name: true, grade: true } },
      classroom: {
        select: {
          id: true,
          roomNo: true,
          campus: true,
          building: true,
        },
      },
      invigilator: {
        select: { id: true, employeeNo: true, name: true },
      },
    } as const;
  }

  private toExamDto(exam: {
    id: number;
    semesterId: number;
    courseId: number;
    course: { id: number; code: string; name: string };
    classGroupId: number;
    classGroup: { id: number; name: string; grade: number };
    classroomId: number;
    classroom: {
      id: number;
      roomNo: string;
      campus: string | null;
      building: string | null;
    };
    startTime: Date;
    endTime: Date;
    invigilatorId: number | null;
    invigilator: {
      id: number;
      employeeNo: string;
      name: string;
    } | null;
  }) {
    return {
      id: exam.id,
      semesterId: exam.semesterId,
      courseId: exam.courseId,
      courseCode: exam.course.code,
      courseName: exam.course.name,
      classGroupId: exam.classGroupId,
      classGroupName: exam.classGroup.name,
      classGroupGrade: exam.classGroup.grade,
      classroomId: exam.classroomId,
      classroomRoomNo: exam.classroom.roomNo,
      classroomCampus: exam.classroom.campus,
      classroomBuilding: exam.classroom.building,
      startTime: exam.startTime.toISOString(),
      endTime: exam.endTime.toISOString(),
      invigilatorId: exam.invigilatorId,
      invigilatorName: exam.invigilator?.name ?? null,
      invigilatorEmployeeNo: exam.invigilator?.employeeNo ?? null,
    };
  }
}
