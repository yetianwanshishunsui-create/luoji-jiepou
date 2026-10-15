import { ForbiddenException, Injectable } from '@nestjs/common';
import type { LoginResult } from '@luoji/shared';
import { WechatService } from '../../integrations/wechat/wechat.service';
import { PrismaService } from '../../prisma/prisma.service';
import { toUserProfile } from '../user/user.mapper';
import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wechat: WechatService,
    private readonly tokens: TokenService,
  ) {}

  async wxLogin(code: string): Promise<LoginResult> {
    const session = await this.wechat.code2Session(code);
    const user = await this.prisma.user.upsert({
      where: { openid: session.openid },
      create: { openid: session.openid, unionid: session.unionid },
      update: session.unionid ? { unionid: session.unionid } : {},
    });
    if (user.disabled) throw new ForbiddenException('账号已停用');

    // TODO(WP03)：session_key 存 Redis，用于后续解密手机号等开放数据
    const tokens = await this.tokens.issue(user.id, user.openid);
    return { ...tokens, user: toUserProfile(user) };
  }

  async refresh(refreshToken: string) {
    const { accessToken, refreshToken: next } = await this.tokens.rotate(refreshToken);
    return { accessToken, refreshToken: next };
  }

  logout(refreshToken: string) {
    return this.tokens.revoke(refreshToken);
  }
}
