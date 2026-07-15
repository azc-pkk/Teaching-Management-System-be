import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole, WorkflowStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ScheduleChangesService } from './schedule-changes.service';

describe('ScheduleChangesService', () => {
  const teacher = {
    id: 10,
    username: 'teacher',
    role: UserRole.TEACHER,
    teacherId: 1,
  };

  it('returns decimal hours as a JSON number', async () => {
    const prisma = {
      teacher: { findUnique: jest.fn().mockResolvedValue({ id: 1 }) },
      course: { findUnique: jest.fn().mockResolvedValue({ id: 2 }) },
      classGroup: { findUnique: jest.fn().mockResolvedValue({ id: 3 }) },
      scheduleChange: {
        create: jest.fn().mockResolvedValue({
          id: 4,
          teacherId: 1,
          teacher: { id: 1, employeeNo: 'T001', name: '教师甲' },
          courseId: 2,
          course: { id: 2, code: 'C001', name: '数据库原理' },
          classGroupId: 3,
          classGroup: { id: 3, name: '计科一班', grade: 2026 },
          hours: { toNumber: () => 2 },
          reason: '教学活动冲突',
          status: 'PENDING',
        }),
      },
    };
    const service = new ScheduleChangesService(
      prisma as unknown as PrismaService,
    );

    const result = await service.create(
      {
        teacherId: 1,
        courseId: 2,
        classGroupId: 3,
        hours: 2,
        reason: '教学活动冲突',
      },
      teacher,
    );

    expect(result.hours).toBe(2);
    expect(typeof result.hours).toBe('number');
  });

  it('rejects a schedule change created for another teacher', async () => {
    const service = new ScheduleChangesService({} as PrismaService);

    await expect(
      service.create(
        {
          teacherId: 2,
          courseId: 2,
          classGroupId: 3,
          hours: 2,
          reason: 'Conflict',
        },
        teacher,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows a system administrator to reach rejection validation', async () => {
    const prisma = {
      scheduleChange: {
        findUnique: jest.fn().mockResolvedValue({
          id: 4,
          teacherId: 1,
          status: WorkflowStatus.PENDING,
        }),
      },
    };
    const service = new ScheduleChangesService(
      prisma as unknown as PrismaService,
    );

    await expect(
      service.updateStatus(
        4,
        { status: WorkflowStatus.REJECTED },
        {
          id: 20,
          username: 'admin',
          role: UserRole.ADMIN,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not allow a teacher to approve a schedule change', async () => {
    const prisma = {
      scheduleChange: {
        findUnique: jest.fn().mockResolvedValue({
          id: 4,
          teacherId: 1,
          status: WorkflowStatus.PENDING,
        }),
      },
    };
    const service = new ScheduleChangesService(
      prisma as unknown as PrismaService,
    );

    await expect(
      service.updateStatus(4, { status: WorkflowStatus.APPROVED }, teacher),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
