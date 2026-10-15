import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AdminRole } from '@luoji/shared';
import type { AppConfig } from '../../config/configuration';
import { IS_PUBLIC } from '../decorators/public.decorator';
import { ROLES } from '../decorators/roles.decorator';
import type { AdminTokenPayload } from '../decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { extractBearer } from './token.util';

/** 后台鉴权 + RBAC。未声明 @Roles 的接口任何已登录管理员可访问；SUPER_ADMIN 始终放行。 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const req = context.switchToHttp().getRequest();
    const token = extractBearer(req);
    if (!token) throw new UnauthorizedException('请先登录');

    let payload: AdminTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AdminTokenPayload>(token, {
        secret: this.config.get('jwt', { infer: true }).adminSecret,
      });
    } catch {
      throw new UnauthorizedException('登录已过期，请重新登录');
    }
    if (payload.typ !== 'admin') throw new UnauthorizedException('token 类型错误');

    // 以数据库为准：停用、改角色、重置密码（token_version 变化）后立即生效
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: payload.sub },
      select: { role: true, disabled: true, tokenVersion: true },
    });
    if (!admin || admin.disabled || admin.tokenVersion !== payload.ver) {
      throw new UnauthorizedException('登录已失效，请重新登录');
    }
    payload.role = admin.role;
    req.admin = payload;

    const roles = this.reflector.getAllAndOverride<AdminRole[] | undefined>(ROLES, targets);
    if (roles?.length && payload.role !== AdminRole.SUPER_ADMIN && !roles.includes(payload.role)) {
      throw new ForbiddenException('没有该操作权限');
    }
    return true;
  }
}
