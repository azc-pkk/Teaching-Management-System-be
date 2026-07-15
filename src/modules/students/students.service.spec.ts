import { BadRequestException } from '@nestjs/common';
import { StudentStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { StudentsService } from './students.service';

describe('StudentsService', () => {
  it('rejects a student number whose class segment differs from the selected class', async () => {
    const prisma = {
      student: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
      classGroup: {
        findUnique: jest.fn().mockResolvedValue({
          id: 3,
          code: '02',
          grade: 2023,
        }),
      },
    };
    const service = new StudentsService(prisma as unknown as PrismaService);

    await expect(
      service.create({
        studentNo: '202301010101',
        name: '测试学生',
        classGroupId: 3,
        grade: 2023,
        status: StudentStatus.ENROLLED,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.student.create).not.toHaveBeenCalled();
  });
});
