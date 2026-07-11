import { createHmac } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { username: loginDto.username },
    });

    if (!user || user.status !== 'ENABLED') {
      return this.loginFailed();
    }

    if (!this.verifyPassword(loginDto.password, user.passwordHash)) {
      return this.loginFailed();
    }

    return {
      success: true,
      data: {
        accessToken: this.createDemoToken(user.id, user.username, user.role),
        user: {
          id: user.id,
          username: user.username,
          realName: user.realName,
          role: user.role,
        },
      },
      message: '登录成功',
    };
  }

  private verifyPassword(password: string, passwordHash: string) {
    if (passwordHash === 'demo-password-hash') {
      return password === '123456';
    }

    return password === passwordHash;
  }

  private loginFailed() {
    return {
      success: false,
      error: {
        code: 'AUTH_INVALID_CREDENTIALS',
        message: '用户名或密码错误',
      },
    };
  }

  private createDemoToken(userId: number, username: string, role: string) {
    const secret = this.configService.get<string>('JWT_SECRET') ?? 'demo-secret';
    const payload = Buffer.from(
      JSON.stringify({ userId, username, role, issuedAt: Date.now() }),
    ).toString('base64url');
    const signature = createHmac('sha256', secret).update(payload).digest('base64url');

    return `${payload}.${signature}`;
  }
}
