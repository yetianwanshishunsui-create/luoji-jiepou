import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type Redis from 'ioredis';
import { randomUUID } from 'node:crypto';
import type { AppConfig } from '../../config/configuration';
import type { UserTokenPayload } from '../../common/decorators/current-user.decorator';
import { ttlToSeconds } from '../../common/ttl.util';
import { REDIS } from '../../redis/redis.module';

const RT_KEY = (jti: string) => `auth:rt:${jti}`;

interface RefreshPayload {
  sub: string;
  openid: string;
  jti: string;
  typ: 'refresh';
}

/** 小程序用户令牌：access 短期 JWT；refresh 存 Redis，可吊销，每次刷新轮换 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  private get jwtConfig() {
    return this.config.get('jwt', { infer: true });
  }

  async issue(userId: string, openid: string) {
    const { userSecret, accessTtl, refreshTtl } = this.jwtConfig;
    const refreshSeconds = ttlToSeconds(refreshTtl);
    const jti = randomUUID();

    const access: UserTokenPayload = { sub: userId, openid, typ: 'user' };
    const refresh: RefreshPayload = { sub: userId, openid, jti, typ: 'refresh' };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(access, { secret: userSecret, expiresIn: ttlToSeconds(accessTtl) }),
      this.jwt.signAsync(refresh, { secret: userSecret, expiresIn: refreshSeconds }),
    ]);
    await this.redis.set(RT_KEY(jti), userId, 'EX', refreshSeconds);
    return { accessToken, refreshToken };
  }

  async rotate(refreshToken: string) {
    let payload: RefreshPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshPayload>(refreshToken, { secret: this.jwtConfig.userSecret });
    } catch {
      throw new UnauthorizedException('登录已过期，请重新登录');
    }
    if (payload.typ !== 'refresh') throw new UnauthorizedException('token 类型错误');

    // DEL 返回 1 才说明该 refresh token 尚未被使用，防止重放
    const deleted = await this.redis.del(RT_KEY(payload.jti));
    if (deleted !== 1) throw new UnauthorizedException('登录已失效，请重新登录');

    return { userId: payload.sub, ...(await this.issue(payload.sub, payload.openid)) };
  }

  async revoke(refreshToken: string) {
    const payload = this.jwt.decode<RefreshPayload | null>(refreshToken);
    if (payload?.jti) await this.redis.del(RT_KEY(payload.jti));
  }
}
