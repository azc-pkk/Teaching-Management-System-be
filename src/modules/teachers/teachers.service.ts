import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateTeacherDto,
  QueryTeacherDto,
  UpdateTeacherDto,
} from './dto/teacher.dto';

@Injectable()
export class TeachersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryTeacherDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const keyword = query.keyword?.trim();
    const where = {
      departmentId: query.departmentId,
      teacherType: query.teacherType,
      title: query.title,
      OR: keyword
        ? [
            { employeeNo: { contains: keyword } },
            { name: { contains: keyword } },
          ]
        : undefined,
    };

    const [teachers, total] = await this.prisma.$transaction([
      this.prisma.teacher.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { employeeNo: 'asc' },
        include: {
          department: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.teacher.count({ where }),
    ]);

    return {
      success: true,
      data: {
        list: teachers.map((teacher) => this.toTeacherDto(teacher)),
        page,
        pageSize,
        total,
      },
    };
  }

  async findOne(id: number) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    return {
      success: true,
      data: this.toTeacherDto(teacher),
    };
  }

  async findOptions() {
    const [departments, teacherTitles, teacherTypes] = await this.prisma.$transaction([
      this.prisma.department.findMany({
        orderBy: [{ parentId: 'asc' }, { code: 'asc' }],
        select: {
          id: true,
          name: true,
        },
      }),
      this.prisma.teacher.findMany({
        where: {
          title: {
            not: null,
          },
        },
        distinct: ['title'],
        orderBy: { title: 'asc' },
        select: {
          title: true,
        },
      }),
      this.prisma.teacher.findMany({
        where: {
          teacherType: {
            not: null,
          },
        },
        distinct: ['teacherType'],
        orderBy: { teacherType: 'asc' },
        select: {
          teacherType: true,
        },
      }),
    ]);

    return {
      success: true,
      data: {
        departments: departments.map((department) => ({
          id: department.id,
          name: department.name,
        })),
        titles: teacherTitles
          .map((teacher) => teacher.title)
          .filter((title): title is string => Boolean(title)),
        teacherTypes: teacherTypes
          .map((teacher) => teacher.teacherType)
          .filter((teacherType): teacherType is string => Boolean(teacherType)),
      },
    };
  }

  async create(createTeacherDto: CreateTeacherDto) {
    await this.ensureEmployeeNoAvailable(createTeacherDto.employeeNo);
    await this.ensureDepartmentExists(createTeacherDto.departmentId);

    const teacher = await this.prisma.teacher.create({
      data: createTeacherDto,
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      success: true,
      data: this.toTeacherDto(teacher),
    };
  }

  async update(id: number, updateTeacherDto: UpdateTeacherDto) {
    await this.ensureTeacherExists(id);

    if (updateTeacherDto.employeeNo) {
      await this.ensureEmployeeNoAvailable(updateTeacherDto.employeeNo, id);
    }

    await this.ensureDepartmentExists(updateTeacherDto.departmentId);

    const teacher = await this.prisma.teacher.update({
      where: { id },
      data: updateTeacherDto,
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      success: true,
      data: this.toTeacherDto(teacher),
    };
  }

  async remove(id: number) {
    await this.ensureTeacherExists(id);

    const relatedCount = await this.countTeacherReferences(id);

    if (relatedCount > 0) {
      throw new ConflictException('Teacher is referenced by business data');
    }

    await this.prisma.teacher.delete({ where: { id } });

    return {
      success: true,
      data: {
        deleted: true,
      },
    };
  }

  private async ensureTeacherExists(id: number) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }
  }

  private async ensureEmployeeNoAvailable(employeeNo: string, excludeId?: number) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { employeeNo },
      select: { id: true },
    });

    if (teacher && teacher.id !== excludeId) {
      throw new ConflictException('Employee number already exists');
    }
  }

  private async ensureDepartmentExists(departmentId?: number) {
    if (!departmentId) {
      return;
    }

    const department = await this.prisma.department.findUnique({
      where: { id: departmentId },
      select: { id: true },
    });

    if (!department) {
      throw new BadRequestException('Department not found');
    }
  }

  private async countTeacherReferences(id: number) {
    const [
      directedCourses,
      invigilatedExams,
      scheduleChanges,
      teachingLogs,
      managedDepartments,
      counseledClasses,
      users,
    ] = await this.prisma.$transaction([
      this.prisma.course.count({ where: { directorId: id } }),
      this.prisma.exam.count({ where: { invigilatorId: id } }),
      this.prisma.scheduleChange.count({ where: { teacherId: id } }),
      this.prisma.teachingLog.count({ where: { teacherId: id } }),
      this.prisma.department.count({ where: { managerId: id } }),
      this.prisma.classGroup.count({ where: { counselorId: id } }),
      this.prisma.user.count({ where: { teacherId: id } }),
    ]);

    return (
      directedCourses +
      invigilatedExams +
      scheduleChanges +
      teachingLogs +
      managedDepartments +
      counseledClasses +
      users
    );
  }

  private toTeacherDto(teacher: {
    id: number;
    employeeNo: string;
    name: string;
    departmentId: number | null;
    department?: { name: string } | null;
    teacherType: string | null;
    title: string | null;
    phone: string | null;
  }) {
    return {
      id: teacher.id,
      employeeNo: teacher.employeeNo,
      name: teacher.name,
      departmentId: teacher.departmentId,
      departmentName: teacher.department?.name ?? null,
      teacherType: teacher.teacherType,
      title: teacher.title,
      phone: teacher.phone,
    };
  }
}
