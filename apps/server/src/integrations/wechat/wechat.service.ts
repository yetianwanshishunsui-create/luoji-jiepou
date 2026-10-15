import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorCode } from '@luoji/shared';
import type { AppConfig } from '../../config/configuration';
import { BizException } from '../../common/exceptions/biz.exception';

export interface WxSession {
  openid: string;
  unionid?: string;
  sessionKey: string;
}

/**
 * 微信开放接口封装。
 * TODO(WP03)：access_token 获取与 Redis 缓存、手机号解密（getuserphonenumber）、订阅消息发送。
 */
@Injectable()
export class WechatService {
  private readonly logger = new Logger(WechatService.name);

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  async code2Session(code: string): Promise<WxSession> {
    const { appId, secret, mockLogin } = this.config.get('wechat', { infer: true });

    if (mockLogin) {
      // 仅本地开发：直接用 code 作为 openid，便于在浏览器 / 接口工具里调试
      return { openid: `mock_${code}`, sessionKey: 'mock' };
    }

    const url = new URL('https://api.weixin.qq.com/sns/jscode2session');
    url.search = new URLSearchParams({ appid: appId, secret, js_code: code, grant_type: 'authorization_code' }).toString();

    const res = await fetch(url);
    const body = (await res.json()) as {
      openid?: string;
      unionid?: string;
      session_key?: string;
      errcode?: number;
      errmsg?: string;
    };
    if (!body.openid || !body.session_key) {
      this.logger.warn(`code2Session 失败 errcode=${body.errcode} errmsg=${body.errmsg}`);
      throw new BizException(ErrorCode.UNAUTHORIZED, '微信登录失败，请重试', HttpStatus.UNAUTHORIZED);
    }
    return { openid: body.openid, unionid: body.unionid, sessionKey: body.session_key };
  }
}
