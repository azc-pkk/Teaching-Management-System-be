import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { AuthenticatedRequest } from './authenticated-user';

type TokenPayload = {
  sub?: string;
  username?: string;
  role?: string;
  exp?: number;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer token is required');
    }

    const token = authorization.slice('Bearer '.length).trim();
    const payload = this.verifyToken(token);
    const userId = Number(payload.sub);

    if (!Number.isInteger(userId) || userId < 1) {
      throw new UnauthorizedException('Invalid token subject');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, role: true, enabled: true },
    });

    if (!user?.enabled) {
      throw new UnauthorizedException('User is unavailable');
    }

    request.user = {
      id: user.id,
      username: user.username,
      role: user.role,
    };
    return true;
  }

  private verifyToken(token: string): TokenPayload {
    const [header, payload, signature, ...extra] = token.split('.');

    if (!header || !payload || !signature || extra.length > 0) {
      throw new UnauthorizedException('Invalid token');
    }

    const secret =
      this.configService.get<string>('JWT_SECRET') ?? 'demo-secret';
    const expectedSignature = createHmac('sha256', secret)
      .update(`${header}.${payload}`)
      .digest();
    const actualSignature = Buffer.from(signature, 'base64url');

    if (
      expectedSignature.length !== actualSignature.length ||
      !timingSafeEqual(expectedSignature, actualSignature)
    ) {
      throw new UnauthorizedException('Invalid token signature');
    }

    try {
      const parsed = JSON.parse(
        Buffer.from(payload, 'base64url').toString('utf8'),
      ) as TokenPayload;

      if (!parsed.exp || parsed.exp <= Math.floor(Date.now() / 1000)) {
        throw new UnauthorizedException('Token has expired');
      }

      if (
        parsed.role &&
        !Object.values(UserRole).includes(parsed.role.toUpperCase() as UserRole)
      ) {
        throw new UnauthorizedException('Invalid token role');
      }

      return parsed;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token payload');
    }
  }
}
