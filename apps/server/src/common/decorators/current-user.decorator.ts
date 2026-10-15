import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface UserTokenPayload {
  sub: string;
  openid: string;
  typ: 'user';
}

export interface AdminTokenPayload {
  sub: string;
  role: import('@luoji/shared').AdminRole;
  typ: 'admin';
  /** 与 admin_users.token_version 一致才有效 */
  ver: number;
}

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): UserTokenPayload => {
  return ctx.switchToHttp().getRequest().user;
});

export const CurrentAdmin = createParamDecorator((_: unknown, ctx: ExecutionContext): AdminTokenPayload => {
  return ctx.switchToHttp().getRequest().admin;
});
