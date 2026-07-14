import { Injectable, NotFoundException } from '@nestjs/common';
import { ClassroomStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  ClassGroupQueryDto,
  ClassroomQueryDto,
  CourseDetailQueryDto,
  CourseQueryDto,
  DepartmentQueryDto,
  MajorQueryDto,
} from './dto/base-data-query.dto';

@Injectable()
export class BaseDataService {
  constructor(private readonly prisma: PrismaService) {}

  async findDepartments(query: DepartmentQueryDto) {
    const departments = await this.prisma.department.findMany({
      where: {
        type: query.type,
        parentId: query.parentId,
      },
      orderBy: [{ parentId: 'asc' }, { code: 'asc' }],
      select: {
        id: true,
        name: true,
        code: true,
        type: true,
        parentId: true,
      },
    });

    return departments;
  }

  async findMajors(query: MajorQueryDto) {
    const majors = await this.prisma.major.findMany({
      where: {
        departmentId: query.departmentId,
      },
      orderBy: { code: 'asc' },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return majors.map((major) => ({
      id: major.id,
      name: major.name,
      code: major.code,
      departmentId: major.departmentId,
      departmentName: major.department.name,
      durationYears: major.durationYears,
    }));
  }

  async findClassGroups(query: ClassGroupQueryDto) {
    const classGroups = await this.prisma.classGroup.findMany({
      where: {
        departmentId: query.departmentId,
        majorId: query.majorId,
        grade: query.grade,
      },
      orderBy: [{ grade: 'desc' }, { name: 'asc' }],
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
    });

    return classGroups.map((classGroup) => ({
      id: classGroup.id,
      name: classGroup.name,
      grade: classGroup.grade,
      majorId: classGroup.majorId,
      majorName: classGroup.major.name,
      departmentId: classGroup.departmentId,
      departmentName: classGroup.department.name,
      studentCount: classGroup.studentCount,
    }));
  }

  async findCourses(query: CourseQueryDto) {
    const keyword = query.keyword?.trim();
    const courses = await this.prisma.course.findMany({
      where: {
        departmentId: query.departmentId,
        OR: keyword
          ? [{ code: { contains: keyword } }, { name: { contains: keyword } }]
          : undefined,
      },
      orderBy: { code: 'asc' },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        director: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return courses.map((course) => ({
      id: course.id,
      code: course.code,
      name: course.name,
      credits: Number(course.credits),
      courseType: course.courseType,
      departmentId: course.departmentId,
      departmentName: course.department?.name ?? null,
      directorId: course.directorId,
      directorName: course.director?.name ?? null,
    }));
  }

  async findCourseDetail(id: number, query: CourseDetailQueryDto) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        department: {
          select: { id: true, code: true, name: true },
        },
        director: {
          select: { id: true, employeeNo: true, name: true, title: true },
        },
        exams: {
          where: { semesterId: query.semesterId },
          orderBy: { startTime: 'asc' },
          include: {
            classGroup: { select: { id: true, name: true, grade: true } },
            classroom: {
              select: {
                id: true,
                campus: true,
                building: true,
                roomNo: true,
              },
            },
            invigilator: {
              select: { id: true, employeeNo: true, name: true },
            },
          },
        },
        scheduleChanges: {
          orderBy: { id: 'desc' },
          include: {
            teacher: {
              select: { id: true, employeeNo: true, name: true },
            },
            classGroup: { select: { id: true, name: true, grade: true } },
          },
        },
        textbookOrders: {
          where: { semesterId: query.semesterId },
          orderBy: [{ semesterId: 'desc' }, { id: 'desc' }],
          include: {
            textbook: {
              select: {
                id: true,
                isbn: true,
                name: true,
                author: true,
                publisher: true,
                price: true,
              },
            },
          },
        },
        teachingLogs: {
          orderBy: { lessonDate: 'desc' },
          include: {
            teacher: {
              select: { id: true, employeeNo: true, name: true },
            },
            classGroup: { select: { id: true, name: true, grade: true } },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return {
      id: course.id,
      code: course.code,
      name: course.name,
      credits: Number(course.credits),
      courseType: course.courseType,
      department: course.department,
      director: course.director,
      arrangements: {
        exams: course.exams.map((exam) => ({
          id: exam.id,
          semesterId: exam.semesterId,
          classGroup: exam.classGroup,
          classroom: exam.classroom,
          startTime: exam.startTime.toISOString(),
          endTime: exam.endTime.toISOString(),
          invigilator: exam.invigilator,
        })),
        scheduleChanges: course.scheduleChanges.map((change) => ({
          id: change.id,
          teacher: change.teacher,
          classGroup: change.classGroup,
          hours: Number(change.hours),
          reason: change.reason,
          status: change.status,
        })),
        textbookOrders: course.textbookOrders.map((order) => ({
          id: order.id,
          semesterId: order.semesterId,
          quantity: order.quantity,
          status: order.status,
          textbook: {
            ...order.textbook,
            price: Number(order.textbook.price),
          },
        })),
        teachingLogs: course.teachingLogs.map((log) => ({
          id: log.id,
          teacher: log.teacher,
          classGroup: log.classGroup,
          lessonDate: log.lessonDate.toISOString().slice(0, 10),
          content: log.content,
          attendanceSummary: log.attendanceSummary,
          status: log.status,
        })),
      },
    };
  }

  async findClassrooms(query: ClassroomQueryDto) {
    const keyword = query.keyword?.trim();
    const classrooms = await this.prisma.classroom.findMany({
      where: {
        campus: query.campus,
        building: query.building,
        status: query.status as ClassroomStatus | undefined,
        OR: keyword
          ? [
              { roomNo: { contains: keyword } },
              { building: { contains: keyword } },
            ]
          : undefined,
      },
      orderBy: [{ campus: 'asc' }, { building: 'asc' }, { roomNo: 'asc' }],
    });

    return classrooms.map((classroom) => ({
      id: classroom.id,
      campus: classroom.campus,
      building: classroom.building,
      roomNo: classroom.roomNo,
      type: classroom.type,
      capacity: classroom.capacity,
      area: classroom.area === null ? null : Number(classroom.area),
      status: classroom.status,
    }));
  }
}
