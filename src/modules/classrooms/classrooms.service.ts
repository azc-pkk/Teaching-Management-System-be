import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClassroomStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateClassroomDto,
  QueryClassroomDto,
  UpdateClassroomDto,
} from './dto/classroom.dto';

@Injectable()
export class ClassroomsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryClassroomDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const keyword = query.keyword?.trim();
    const where = {
      campus: query.campus,
      building: query.building,
      type: query.type,
      status: query.status,
      OR: keyword
        ? [
            { roomNo: { contains: keyword } },
            { building: { contains: keyword } },
            { campus: { contains: keyword } },
            { type: { contains: keyword } },
          ]
        : undefined,
    };

    const [classrooms, total] = await this.prisma.$transaction([
      this.prisma.classroom.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ campus: 'asc' }, { building: 'asc' }, { roomNo: 'asc' }],
      }),
      this.prisma.classroom.count({ where }),
    ]);

    return {
      success: true,
      data: {
        list: classrooms.map((classroom) => this.toClassroomDto(classroom)),
        page,
        pageSize,
        total,
      },
    };
  }

  async findOne(id: number) {
    const classroom = await this.prisma.classroom.findUnique({
      where: { id },
    });

    if (!classroom) {
      throw new NotFoundException('Classroom not found');
    }

    return {
      success: true,
      data: this.toClassroomDto(classroom),
    };
  }

  async findOptions() {
    const [campuses, buildings, types] = await this.prisma.$transaction([
      this.prisma.classroom.findMany({
        where: { campus: { not: null } },
        distinct: ['campus'],
        orderBy: { campus: 'asc' },
        select: { campus: true },
      }),
      this.prisma.classroom.findMany({
        where: { building: { not: null } },
        distinct: ['building'],
        orderBy: { building: 'asc' },
        select: { building: true },
      }),
      this.prisma.classroom.findMany({
        where: { type: { not: null } },
        distinct: ['type'],
        orderBy: { type: 'asc' },
        select: { type: true },
      }),
    ]);

    return {
      success: true,
      data: {
        campuses: campuses
          .map((classroom) => classroom.campus)
          .filter((campus): campus is string => Boolean(campus)),
        buildings: buildings
          .map((classroom) => classroom.building)
          .filter((building): building is string => Boolean(building)),
        types: types
          .map((classroom) => classroom.type)
          .filter((type): type is string => Boolean(type)),
        statuses: Object.values(ClassroomStatus),
      },
    };
  }

  async create(createClassroomDto: CreateClassroomDto) {
    await this.ensureRoomNoAvailable(createClassroomDto.roomNo);

    const classroom = await this.prisma.classroom.create({
      data: {
        ...createClassroomDto,
        status: createClassroomDto.status ?? ClassroomStatus.AVAILABLE,
      },
    });

    return {
      success: true,
      data: this.toClassroomDto(classroom),
    };
  }

  async update(id: number, updateClassroomDto: UpdateClassroomDto) {
    await this.ensureClassroomExists(id);

    if (updateClassroomDto.roomNo) {
      await this.ensureRoomNoAvailable(updateClassroomDto.roomNo, id);
    }

    const classroom = await this.prisma.classroom.update({
      where: { id },
      data: updateClassroomDto,
    });

    return {
      success: true,
      data: this.toClassroomDto(classroom),
    };
  }

  async remove(id: number) {
    await this.ensureClassroomExists(id);

    const [examCount, requestCount] = await this.prisma.$transaction([
      this.prisma.exam.count({ where: { classroomId: id } }),
      this.prisma.classroomRequest.count({ where: { classroomId: id } }),
    ]);

    if (examCount + requestCount > 0) {
      throw new ConflictException('Classroom is referenced by business data');
    }

    await this.prisma.classroom.delete({ where: { id } });

    return {
      success: true,
      data: {
        deleted: true,
      },
    };
  }

  private async ensureClassroomExists(id: number) {
    const classroom = await this.prisma.classroom.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!classroom) {
      throw new NotFoundException('Classroom not found');
    }
  }

  private async ensureRoomNoAvailable(roomNo: string, excludeId?: number) {
    const classroom = await this.prisma.classroom.findUnique({
      where: { roomNo },
      select: { id: true },
    });

    if (classroom && classroom.id !== excludeId) {
      throw new ConflictException('Room number already exists');
    }
  }

  private toClassroomDto(classroom: {
    id: number;
    campus: string | null;
    building: string | null;
    roomNo: string;
    type: string | null;
    capacity: number;
    area: { toNumber(): number } | number | null;
    status: string;
  }) {
    return {
      id: classroom.id,
      campus: classroom.campus,
      building: classroom.building,
      roomNo: classroom.roomNo,
      type: classroom.type,
      capacity: classroom.capacity,
      area:
        classroom.area === null
          ? null
          : typeof classroom.area === 'number'
            ? classroom.area
            : classroom.area.toNumber(),
      status: classroom.status,
    };
  }
}
