import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterStudentDto } from './dto/register-student.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { username: loginDto.username },
      include: {
        teacher: true,
        student: true,
      },
    });

    if (!user || !user.enabled) {
      return this.loginFailed();
    }

    if (!this.verifyPassword(loginDto.password, user.passwordHash)) {
      return this.loginFailed();
    }

    return {
      token: this.createDemoToken(user.id, user.username, user.role),
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role.toLowerCase(),
        teacherId: user.teacher?.id ?? null,
        studentId: user.student?.id ?? null,
        enabled: user.enabled,
      },
    };
  }

  async registerStudent(registerDto: RegisterStudentDto) {
    const studentNo = registerDto.studentNo.trim();
    const name = registerDto.name.trim();

    const student = await this.prisma.student.findFirst({
      where: {
        studentNo,
        name,
      },
      include: {
        user: true,
      },
    });

    if (!student) {
      throw new BadRequestException('Student number and name do not match');
    }

    if (student.status !== 'ENROLLED') {
      throw new BadRequestException('Only enrolled students can register');
    }

    if (student.user) {
      throw new ConflictException('This student has already registered');
    }

    const userWithSameUsername = await this.prisma.user.findUnique({
      where: { username: studentNo },
    });

    if (userWithSameUsername) {
      throw new ConflictException('This student number has already been used');
    }

    const user = await this.prisma.user.create({
      data: {
        username: studentNo,
        passwordHash: this.hashPassword(registerDto.password),
        name: student.name,
        role: UserRole.STUDENT,
        studentId: student.id,
        enabled: true,
      },
      include: {
        teacher: true,
        student: true,
      },
    });

    return { user: this.toLoginUser(user) };
  }

  async currentUser(authorization?: string) {
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice(7).trim()
      : '';
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const payload = this.verifyDemoToken(token);
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId)) {
      throw new UnauthorizedException('Invalid login token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { teacher: true, student: true },
    });
    if (!user || !user.enabled) {
      throw new UnauthorizedException('User is disabled or does not exist');
    }
    return this.toLoginUser(user);
  }

  private verifyPassword(password: string, passwordHash: string) {
    if (passwordHash === 'demo-password-hash') {
      return password === '123456';
    }

    if (passwordHash.startsWith('scrypt$')) {
      const [, salt, storedHash] = passwordHash.split('$');
      const passwordHashBuffer = scryptSync(password, salt, 64);
      const storedHashBuffer = Buffer.from(storedHash, 'hex');

      return (
        passwordHashBuffer.length === storedHashBuffer.length &&
        timingSafeEqual(passwordHashBuffer, storedHashBuffer)
      );
    }

    return password === passwordHash;
  }

  private hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');

    return `scrypt$${salt}$${hash}`;
  }

  private loginFailed() {
    throw new UnauthorizedException('Invalid username or password');
  }

  private createDemoToken(userId: number, username: string, role: string) {
    const secret =
      this.configService.get<string>('JWT_SECRET') ?? 'demo-secret';
    const issuedAt = Math.floor(Date.now() / 1000);
    const header = Buffer.from(
      JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
    ).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        sub: String(userId),
        username,
        role: role.toLowerCase(),
        iat: issuedAt,
        exp: issuedAt + 60 * 60 * 24,
      }),
    ).toString('base64url');
    const signature = createHmac('sha256', secret)
      .update(`${header}.${payload}`)
      .digest('base64url');

    return `${header}.${payload}.${signature}`;
  }

  private verifyDemoToken(token: string): { sub?: string } {
    const parts = token.split('.');
    if (parts.length !== 3) throw new UnauthorizedException('Invalid login token');
    const [header, payload, signature] = parts;
    const secret = this.configService.get<string>('JWT_SECRET') ?? 'demo-secret';
    const expected = createHmac('sha256', secret)
      .update(`${header}.${payload}`)
      .digest('base64url');
    if (signature !== expected) throw new UnauthorizedException('Invalid login token');
    try {
      const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { sub?: string; exp?: number };
      if (typeof decoded.exp === 'number' && decoded.exp < Math.floor(Date.now() / 1000)) {
        throw new UnauthorizedException('Login token expired');
      }
      return decoded;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid login token');
    }
  }

  private toLoginUser(user: {
    id: number;
    username: string;
    name: string;
    role: string;
    teacher?: { id: number } | null;
    student?: { id: number } | null;
    enabled: boolean;
  }) {
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role.toLowerCase(),
      teacherId: user.teacher?.id ?? null,
      studentId: user.student?.id ?? null,
      enabled: user.enabled,
    };
  }
}
