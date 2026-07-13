import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ExamsService } from './exams.service';

describe('ExamsService', () => {
  it('rejects an exam when the classroom time overlaps another exam', async () => {
    const prisma = {
      course: { findUnique: jest.fn().mockResolvedValue({ id: 1 }) },
      classGroup: { findUnique: jest.fn().mockResolvedValue({ id: 1 }) },
      classroom: { findUnique: jest.fn().mockResolvedValue({ id: 1 }) },
      exam: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ id: 9 })
          .mockResolvedValueOnce(null),
        create: jest.fn(),
      },
      classroomRequest: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new ExamsService(prisma as unknown as PrismaService);

    await expect(
      service.create({
        semesterId: 202601,
        courseId: 1,
        classGroupId: 1,
        classroomId: 1,
        startTime: '2027-01-10T01:00:00.000Z',
        endTime: '2027-01-10T03:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.exam.create).not.toHaveBeenCalled();
  });
});
