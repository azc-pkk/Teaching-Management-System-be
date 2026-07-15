import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  it('logs in with the current student number and repairs a stale username', async () => {
    const staleUser = {
      id: 9,
      username: '20230004',
      passwordHash: 'Student123456',
      name: '测试学生004',
      role: 'STUDENT',
      enabled: true,
      teacher: null,
      student: { id: 3 },
    };
    const repairedUser = {
      ...staleUser,
      username: '202301020101',
    };
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue(repairedUser),
      },
      student: {
        findUnique: jest.fn().mockResolvedValue({ user: staleUser }),
      },
    };
    const configService = {
      get: jest.fn().mockReturnValue('test-secret'),
    };
    const service = new AuthService(
      prisma as unknown as PrismaService,
      configService as unknown as ConfigService,
    );

    const result = await service.login({
      username: '202301020101',
      password: 'Student123456',
    });

    expect(result.user.username).toBe('202301020101');
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 9 },
        data: { username: '202301020101' },
      }),
    );
  });

  it('returns administrator identity for the current account', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1,
          username: 'admin',
          name: '系统管理员',
          role: 'ADMIN',
          enabled: true,
          teacher: null,
          student: null,
        }),
      },
    };
    const service = new AuthService(
      prisma as unknown as PrismaService,
      { get: jest.fn() } as unknown as ConfigService,
    );

    const result = await service.getCurrentUser(1);

    expect(result.user.id).toBe(1);
    expect(result.user.displayName).toBe('系统管理员');
    expect(result.identity).toEqual({
      role: 'admin',
      roleCode: 'ADMIN',
      roleLabel: '系统管理员',
      isAdministrator: true,
    });
    expect(result.teacherProfile).toBeNull();
    expect(result.studentProfile).toBeNull();
  });

  it('returns class and school information for a student account', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 20,
          username: '202301020101',
          name: '测试学生',
          role: 'STUDENT',
          enabled: true,
          teacher: null,
          student: {
            id: 30,
            studentNo: '202301020101',
            name: '测试学生',
            grade: 2023,
            status: 'ENROLLED',
            phone: null,
            classGroup: {
              id: 3,
              code: '02',
              name: '计算机科学与技术2023级2班',
              majorId: 2,
              departmentId: 1,
              major: { name: '计算机科学与技术' },
              department: { name: '信息工程学院' },
              counselor: { id: 8, name: '辅导员' },
            },
          },
        }),
      },
    };
    const service = new AuthService(
      prisma as unknown as PrismaService,
      { get: jest.fn() } as unknown as ConfigService,
    );

    const result = await service.getCurrentUser(20);

    expect(result.identity.roleLabel).toBe('学生');
    expect(result.studentProfile).toEqual(
      expect.objectContaining({
        classGroupId: 3,
        classGroupCode: '02',
        majorName: '计算机科学与技术',
        departmentName: '信息工程学院',
      }),
    );
  });
});
