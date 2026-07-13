import { ConflictException } from '@nestjs/common';
import { WorkflowStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ClassroomRequestsService } from './classroom-requests.service';

describe('ClassroomRequestsService', () => {
  it('rechecks classroom availability before approving a request', async () => {
    const prisma = {
      classroomRequest: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1,
          applicantId: 1,
          classroomId: 2,
          startTime: new Date('2026-09-10T06:00:00.000Z'),
          endTime: new Date('2026-09-10T08:00:00.000Z'),
        }),
        count: jest.fn().mockResolvedValue(0),
      },
      exam: {
        count: jest.fn().mockResolvedValue(1),
      },
      $transaction: jest.fn((operations: Promise<unknown>[]) =>
        Promise.all(operations),
      ),
    };
    const service = new ClassroomRequestsService(
      prisma as unknown as PrismaService,
    );

    await expect(
      service.updateStatus(1, { status: WorkflowStatus.APPROVED }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
