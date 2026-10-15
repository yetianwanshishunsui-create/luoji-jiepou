import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { AppConfig } from '../../config/configuration';
import { IS_PUBLIC } from '../decorators/public.decorator';
import type { UserTokenPayload } from '../decorators/current-user.decorator';
import { extractBearer } from './token.util';

/**
 * 小程序用户鉴权。@Public() 的接口不强制登录，但带了有效 token 时仍会解析出 req.user，
 * 便于公开接口按身份返回差异化内容。
 */
@Injectable()
export class UserAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()]);
    const req = context.switchToHttp().getRequest();
    const token = extractBearer(req);

    if (!token) {
      if (isPublic) return true;
      throw new UnauthorizedException('请先登录');
    }

    try {
      const payload = await this.jwt.verifyAsync<UserTokenPayload>(token, {
        secret: this.config.get('jwt', { infer: true }).userSecret,
      });
      if (payload.typ !== 'user') throw new Error('token 类型错误');
      req.user = payload;
    } catch {
      if (isPublic) return true;
      throw new UnauthorizedException('登录已过期，请重新登录');
    }
    return true;
  }
}
