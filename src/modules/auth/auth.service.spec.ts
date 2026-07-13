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
});
