import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
    const where = {
      classGroupId: query.classGroupId,
      grade: query.grade,
      status: query.status,
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
        },
      }),
      this.prisma.student.count({ where }),
    ]);

    return {
      success: true,
      data: {
        list: students.map((student) => this.toStudentDto(student)),
        page,
        pageSize,
        total,
      },
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
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return {
      success: true,
      data: this.toStudentDto(student),
    };
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
      },
    });

    return {
      success: true,
      data: this.toStudentDto(student),
    };
  }

  async update(id: number, updateStudentDto: UpdateStudentDto) {
    await this.ensureStudentExists(id);

    if (updateStudentDto.studentNo) {
      await this.ensureStudentNoAvailable(updateStudentDto.studentNo, id);
    }

    await this.ensureClassGroupExists(updateStudentDto.classGroupId);

    const student = await this.prisma.student.update({
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
      },
    });

    return {
      success: true,
      data: this.toStudentDto(student),
    };
  }

  async remove(id: number) {
    await this.ensureStudentExists(id);

    const relatedCount = await this.countStudentReferences(id);

    if (relatedCount > 0) {
      throw new ConflictException('Student is referenced by business data');
    }

    await this.prisma.student.delete({ where: { id } });

    return {
      success: true,
      data: {
        deleted: true,
      },
    };
  }

  private async ensureStudentExists(id: number) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }
  }

  private async ensureStudentNoAvailable(studentNo: string, excludeId?: number) {
    const student = await this.prisma.student.findUnique({
      where: { studentNo },
      select: { id: true },
    });

    if (student && student.id !== excludeId) {
      throw new ConflictException('Student number already exists');
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
    const [graduationReviews, users] = await this.prisma.$transaction([
      this.prisma.graduationReview.count({ where: { studentId: id } }),
      this.prisma.user.count({ where: { studentId: id } }),
    ]);

    return graduationReviews + users;
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
  }) {
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
    };
  }
}
