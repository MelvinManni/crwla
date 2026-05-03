import { ExecutionContext, createParamDecorator } from '@nestjs/common';

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MEMBER';
  team: string | null;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const req = ctx.switchToHttp().getRequest();
    return req.user as AuthenticatedUser;
  },
);
