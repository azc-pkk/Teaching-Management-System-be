import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '../../../generated/prisma/client';
import type { Request } from 'express';

export type AuthenticatedUser = {
  id: number;
  username: string;
  role: UserRole;
};

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
