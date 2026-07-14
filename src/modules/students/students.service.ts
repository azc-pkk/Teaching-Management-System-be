import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StudentStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateStudentDto,
  QueryStudentDto,
  UpdateStudentDto,
} from './dto/student.dto';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryStudentDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const keyword = query.keyword?.trim();
    const userFilter =
      query.enabled !== undefined
        ? { is: { enabled: query.enabled } }
        : query.activated === undefined
          ? undefined
          : query.activated
            ? { isNot: null }
            : { is: null };
    const where = {
      classGroupId: query.classGroupId,
      grade: query.grade,
      status: query.status,
      classGroup:
        query.departmentId || query.majorId
          ? {
              departmentId: query.departmentId,
              majorId: query.majorId,
            }
          : undefined,
      user: userFilter,
      OR: keyword
        ? [
            { studentNo: { contains: keyword } },
            { name: { contains: keyword } },
          ]
        : undefined,
    };

    const [students, total] = await this.prisma.$transaction([
      this.prisma.student.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { studentNo: 'asc' },
        include: {
          classGroup: {
            include: {
              department: {
                select: {
                  id: true,
                  name: true,
                },
              },
              major: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              username: true,
              name: true,
              role: true,
              enabled: true,
            },
          },
        },
      }),
      this.prisma.student.count({ where }),
    ]);

    return {
      list: students.map((student) => this.toStudentDto(student)),
      page,
      pageSize,
      total,
    };
  }

  async findOne(id: number) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        classGroup: {
          include: {
            department: {
              select: {
                id: true,
                name: true,
              },
            },
            major: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            role: true,
            enabled: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return this.toStudentDto(student);
<<<<<<< HEAD
  }

  async findOptions() {
    const [departments, majors, classGroups] = await this.prisma.$transaction([
      this.prisma.department.findMany({
        orderBy: [{ parentId: 'asc' }, { code: 'asc' }],
        select: {
          id: true,
          name: true,
        },
      }),
      this.prisma.major.findMany({
        orderBy: { code: 'asc' },
        select: {
          id: true,
          name: true,
          departmentId: true,
        },
      }),
      this.prisma.classGroup.findMany({
        orderBy: [{ grade: 'desc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          grade: true,
          majorId: true,
          departmentId: true,
        },
      }),
    ]);

    return {
      departments,
      majors,
      classGroups,
      grades: [...new Set(classGroups.map((classGroup) => classGroup.grade))],
      statuses: Object.values(StudentStatus),
    };
=======
>>>>>>> 0de8e26c4ebbd09cb7820d60e5fd8d4df61fe2f3
  }

  async create(createStudentDto: CreateStudentDto) {
    await this.ensureStudentNoAvailable(createStudentDto.studentNo);
    await this.ensureClassGroupExists(createStudentDto.classGroupId);

    const student = await this.prisma.student.create({
      data: createStudentDto,
      include: {
        classGroup: {
          include: {
            department: {
              select: {
                id: true,
                name: true,
              },
            },
            major: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            role: true,
            enabled: true,
          },
        },
      },
    });

    return this.toStudentDto(student);
  }

  async update(id: number, updateStudentDto: UpdateStudentDto) {
    const current = await this.ensureStudentExists(id);

    if (updateStudentDto.studentNo) {
      await this.ensureStudentNoAvailable(updateStudentDto.studentNo, id);
    }

    await this.ensureClassGroupExists(updateStudentDto.classGroupId);

    const shouldSyncUser =
      current.user !== null && /^\d+$/.test(current.user.username);
    const targetUsername = updateStudentDto.studentNo ?? current.studentNo;

    if (shouldSyncUser && targetUsername !== current.user?.username) {
      await this.ensureUsernameAvailable(targetUsername, current.user?.id);
    }

    const student = await this.prisma.$transaction(async (tx) => {
      if (shouldSyncUser && current.user) {
        await tx.user.update({
          where: { id: current.user.id },
          data: {
            username: targetUsername,
            name: updateStudentDto.name,
          },
        });
      }

      return tx.student.update({
        where: { id },
        data: updateStudentDto,
        include: {
          classGroup: {
            include: {
              department: {
                select: {
                  id: true,
                  name: true,
                },
              },
              major: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              username: true,
              name: true,
              role: true,
              enabled: true,
            },
          },
        },
      });
    });

    return this.toStudentDto(student);
  }

  async remove(id: number) {
    const student = await this.ensureStudentExists(id);

    const relatedCount = await this.countStudentReferences(id);

    if (relatedCount > 0) {
      throw new ConflictException('Student is referenced by business data');
    }

    await this.prisma.$transaction([
      this.prisma.student.delete({ where: { id } }),
      this.prisma.classGroup.update({
        where: { id: student.classGroupId },
        data: { studentCount: { decrement: 1 } },
      }),
    ]);

    return { deleted: true };
  }

  private async ensureStudentExists(id: number) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      select: {
        id: true,
        studentNo: true,
        classGroupId: true,
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  private async ensureStudentNoAvailable(
    studentNo: string,
    excludeId?: number,
  ) {
    const student = await this.prisma.student.findUnique({
      where: { studentNo },
      select: { id: true },
    });

    if (student && student.id !== excludeId) {
      throw new ConflictException('Student number already exists');
    }
  }

  private async ensureUsernameAvailable(username: string, excludeId?: number) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (user && user.id !== excludeId) {
      throw new ConflictException('Student number is already used as username');
    }
  }

  private async ensureClassGroupExists(classGroupId?: number) {
    if (!classGroupId) {
      return;
    }

    const classGroup = await this.prisma.classGroup.findUnique({
      where: { id: classGroupId },
      select: { id: true },
    });

    if (!classGroup) {
      throw new BadRequestException('Class group not found');
    }
  }

  private async countStudentReferences(id: number) {
    return this.prisma.graduationReview.count({ where: { studentId: id } });
  }

  private toStudentDto(student: {
    id: number;
    studentNo: string;
    name: string;
    classGroupId: number;
    classGroup: {
      name: string;
      majorId: number;
      major: { name: string };
      departmentId: number;
      department: { name: string };
    };
    grade: number;
    status: string;
    phone: string | null;
    user: {
      id: number;
      username: string;
      name: string;
      role: string;
      enabled: boolean;
    } | null;
  }) {
    const user = student.user
      ? {
          id: student.user.id,
          username: student.user.username,
          name: student.user.name,
          role: student.user.role.toLowerCase(),
          enabled: student.user.enabled,
        }
      : null;

    return {
      id: student.id,
      studentNo: student.studentNo,
      name: student.name,
      classGroupId: student.classGroupId,
      classGroupName: student.classGroup.name,
      grade: student.grade,
      status: student.status,
      phone: student.phone,
      majorId: student.classGroup.majorId,
      majorName: student.classGroup.major.name,
      departmentId: student.classGroup.departmentId,
      departmentName: student.classGroup.department.name,
      activated: Boolean(user),
      enabled: user?.enabled ?? false,
      user,
    };
  }
}
