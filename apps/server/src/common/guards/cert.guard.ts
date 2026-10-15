import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CertStatus, ErrorCode } from '@luoji/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { REQUIRE_CERT } from '../decorators/require-cert.decorator';
import { BizException } from '../exceptions/biz.exception';

/**
 * 认证准入：带 @RequireCert() 的接口要求用户认证状态为 APPROVED。
 * 状态从数据库实时读取（不信任 token 中的旧状态），保证撤销认证立即生效。
 * 必须放在 UserAuthGuard 之后使用。
 */
@Injectable()
export class CertGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<boolean>(REQUIRE_CERT, [context.getHandler(), context.getClass()]);
    if (!required) return true;

    const req = context.switchToHttp().getRequest();
    if (!req.user) throw new BizException(ErrorCode.UNAUTHORIZED, '请先登录', HttpStatus.UNAUTHORIZED);

    const user = await this.prisma.user.findUnique({
      where: { id: req.user.sub },
      select: { certStatus: true, identityType: true, disabled: true },
    });
    if (!user || user.disabled) throw new BizException(ErrorCode.FORBIDDEN, '账号不可用', HttpStatus.FORBIDDEN);
    if (user.certStatus === CertStatus.PENDING) {
      throw new BizException(ErrorCode.CERT_PENDING, '认证审核中，通过后即可访问', HttpStatus.FORBIDDEN);
    }
    if (user.certStatus !== CertStatus.APPROVED) {
      throw new BizException(ErrorCode.CERT_REQUIRED, '请先完成身份认证', HttpStatus.FORBIDDEN);
    }
    req.identityType = user.identityType;
    return true;
  }
}
