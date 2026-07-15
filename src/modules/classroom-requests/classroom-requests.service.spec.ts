import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApprovalAction,
  ClassroomStatus,
  UserRole,
  WorkflowStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ClassroomRequestsService } from './classroom-requests.service';

const future = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000);

const applicant = {
  id: 1,
  username: 'student001',
  role: UserRole.STUDENT,
};
const academic = {
  id: 2,
  username: 'academic',
  role: UserRole.ACADEMIC,
};
const admin = {
  id: 3,
  username: 'admin',
  role: UserRole.ADMIN,
};

describe('ClassroomRequestsService', () => {
  it('rejects participant counts above classroom capacity', async () => {
    const prisma = {
      classroom: {
        findUnique: jest.fn().mockResolvedValue({
          id: 2,
          status: ClassroomStatus.AVAILABLE,
          capacity: 10,
        }),
      },
    };
    const service = new ClassroomRequestsService(
      prisma as unknown as PrismaService,
    );

    await expect(
      service.create(
        {
          classroomId: 2,
          participantCount: 11,
          startTime: future(1).toISOString(),
          endTime: future(2).toISOString(),
          purpose: 'Discussion',
        },
        applicant,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows a system administrator to reach rejection validation', async () => {
    const prisma = {
      classroomRequest: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1,
          applicantId: applicant.id,
          classroomId: 2,
          participantCount: 5,
          startTime: future(1),
          endTime: future(2),
          status: WorkflowStatus.PENDING,
        }),
      },
    };
    const service = new ClassroomRequestsService(
      prisma as unknown as PrismaService,
    );

    await expect(
      service.updateStatus(
        1,
        { status: WorkflowStatus.REJECTED, comment: '   ' },
        admin,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows only academic administrators to approve or reject', async () => {
    const prisma = {
      classroomRequest: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1,
          applicantId: applicant.id,
          classroomId: 2,
          participantCount: 5,
          startTime: future(1),
          endTime: future(2),
          status: WorkflowStatus.PENDING,
        }),
      },
    };
    const service = new ClassroomRequestsService(
      prisma as unknown as PrismaService,
    );

    await expect(
      service.updateStatus(
        1,
        { status: WorkflowStatus.APPROVED },
        { ...academic, role: UserRole.DEPARTMENT_ADMIN },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('does not allow an applicant to cancel after the request has started', async () => {
    const prisma = {
      classroomRequest: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1,
          applicantId: applicant.id,
          classroomId: 2,
          participantCount: 5,
          startTime: new Date(Date.now() - 60_000),
          endTime: future(1),
          status: WorkflowStatus.PENDING,
        }),
      },
    };
    const service = new ClassroomRequestsService(
      prisma as unknown as PrismaService,
    );

    await expect(
      service.updateStatus(1, { status: WorkflowStatus.CANCELLED }, applicant),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rechecks classroom availability before approving a request', async () => {
    const prisma = {
      classroomRequest: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1,
          applicantId: applicant.id,
          classroomId: 2,
          participantCount: 5,
          startTime: future(1),
          endTime: future(2),
          status: WorkflowStatus.PENDING,
        }),
        count: jest.fn().mockResolvedValue(0),
      },
      classroom: {
        findUnique: jest.fn().mockResolvedValue({
          id: 2,
          status: ClassroomStatus.AVAILABLE,
          capacity: 20,
        }),
      },
      exam: { count: jest.fn().mockResolvedValue(1) },
      $transaction: jest.fn((operations: Promise<unknown>[]) =>
        Promise.all(operations),
      ),
    };
    const service = new ClassroomRequestsService(
      prisma as unknown as PrismaService,
    );

    await expect(
      service.updateStatus(1, { status: WorkflowStatus.APPROVED }, academic),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('writes rejection records and returns the approval timeline', async () => {
    const startTime = future(1);
    const endTime = future(2);
    const current = {
      id: 1,
      applicantId: applicant.id,
      classroomId: 2,
      participantCount: 5,
      startTime,
      endTime,
      purpose: 'Discussion',
      status: WorkflowStatus.PENDING,
      applicant: {
        id: applicant.id,
        username: applicant.username,
        name: 'Student',
        role: applicant.role,
      },
      classroom: {
        id: 2,
        campus: null,
        building: null,
        roomNo: 'A101',
        type: null,
        capacity: 20,
        status: ClassroomStatus.AVAILABLE,
      },
    };
    const prisma = {
      classroomRequest: {
        findUnique: jest.fn().mockResolvedValue(current),
        update: jest.fn().mockResolvedValue({
          ...current,
          status: WorkflowStatus.REJECTED,
        }),
      },
      approvalRecord: {
        create: jest
          .fn<Promise<{ id: number }>, [unknown]>()
          .mockResolvedValue({ id: 9 }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 9,
            businessId: 1,
            action: ApprovalAction.REJECT,
            comment: 'Time conflict',
            createdAt: new Date('2026-07-14T08:00:00.000Z'),
            operator: {
              id: academic.id,
              username: academic.username,
              name: 'Academic Admin',
              role: academic.role,
            },
          },
        ]),
      },
      $transaction: jest.fn<Promise<unknown>, [unknown]>(),
    };
    prisma.$transaction.mockImplementation((operation: unknown) => {
      if (typeof operation === 'function') {
        const callback = operation as (
          transactionClient: typeof prisma,
        ) => Promise<unknown>;
        return callback(prisma);
      }

      return Promise.all(operation as Promise<unknown>[]);
    });
    const service = new ClassroomRequestsService(
      prisma as unknown as PrismaService,
    );

    const result = await service.updateStatus(
      1,
      { status: WorkflowStatus.REJECTED, comment: ' Time conflict ' },
      academic,
    );

    const createCall: unknown = prisma.approvalRecord.create.mock.calls[0]?.[0];
    const approvalData = (
      createCall as {
        data: {
          operatorId: number;
          action: ApprovalAction;
          comment: string;
        };
      }
    ).data;
    expect(approvalData.operatorId).toBe(academic.id);
    expect(approvalData.action).toBe(ApprovalAction.REJECT);
    expect(approvalData.comment).toBe('Time conflict');
    expect(result?.latestApproval).toEqual(
      expect.objectContaining({
        action: ApprovalAction.REJECT,
        comment: 'Time conflict',
      }),
    );
    expect(result?.approvalHistory).toHaveLength(1);
  });
});
