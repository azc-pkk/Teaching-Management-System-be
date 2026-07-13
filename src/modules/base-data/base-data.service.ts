import { Injectable } from '@nestjs/common';
import { ClassroomStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  ClassGroupQueryDto,
  ClassroomQueryDto,
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

    return {
      success: true,
      data: departments,
    };
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

    return {
      success: true,
      data: majors.map((major) => ({
        id: major.id,
        name: major.name,
        code: major.code,
        departmentId: major.departmentId,
        departmentName: major.department.name,
        durationYears: major.durationYears,
      })),
    };
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

    return {
      success: true,
      data: classGroups.map((classGroup) => ({
        id: classGroup.id,
        name: classGroup.name,
        grade: classGroup.grade,
        majorId: classGroup.majorId,
        majorName: classGroup.major.name,
        departmentId: classGroup.departmentId,
        departmentName: classGroup.department.name,
        studentCount: classGroup.studentCount,
      })),
    };
  }

  async findCourses(query: CourseQueryDto) {
    const keyword = query.keyword?.trim();
    const courses = await this.prisma.course.findMany({
      where: {
        departmentId: query.departmentId,
        OR: keyword
          ? [
              { code: { contains: keyword } },
              { name: { contains: keyword } },
            ]
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

    return {
      success: true,
      data: courses.map((course) => ({
        id: course.id,
        code: course.code,
        name: course.name,
        credits: Number(course.credits),
        courseType: course.courseType,
        departmentId: course.departmentId,
        departmentName: course.department?.name ?? null,
        directorId: course.directorId,
        directorName: course.director?.name ?? null,
      })),
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

    return {
      success: true,
      data: classrooms.map((classroom) => ({
        id: classroom.id,
        campus: classroom.campus,
        building: classroom.building,
        roomNo: classroom.roomNo,
        type: classroom.type,
        capacity: classroom.capacity,
        area: classroom.area === null ? null : Number(classroom.area),
        status: classroom.status,
      })),
    };
  }
}
