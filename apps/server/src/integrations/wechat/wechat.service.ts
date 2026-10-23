import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorCode } from '@luoji/shared';
import type { AppConfig } from '../../config/configuration';
import { BizException } from '../../common/exceptions/biz.exception';
import { REDIS } from '../../redis/redis.module';
import type Redis from 'ioredis';

/** 内容安全检测建议：pass 通过；review 需人工复核；risky 违规；error 检测失败（按需人工复核处理） */
export type SecSuggest = 'pass' | 'review' | 'risky' | 'error';

/** 内容安全检测场景（msgSecCheck v2）：2 = 评论 */
const SCENE_COMMENT = 2;
const TOKEN_KEY = 'wx:access_token';

export interface WxSession {
  openid: string;
  unionid?: string;
  sessionKey: string;
}

/**
 * 微信开放接口封装。
 * TODO(WP03)：手机号解密（getuserphonenumber）、订阅消息发送。
 */
@Injectable()
export class WechatService {
  private readonly logger = new Logger(WechatService.name);

  constructor(
    private readonly config: ConfigService<AppConfig, true>,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  /** 接口调用凭证，Redis 缓存到过期前 5 分钟 */
  private async accessToken(): Promise<string> {
    const cached = await this.redis.get(TOKEN_KEY);
    if (cached) return cached;
    const { appId, secret } = this.config.get('wechat', { infer: true });
    const url = new URL('https://api.weixin.qq.com/cgi-bin/token');
    url.search = new URLSearchParams({ grant_type: 'client_credential', appid: appId, secret }).toString();
    const body = (await (await fetch(url)).json()) as { access_token?: string; expires_in?: number; errcode?: number; errmsg?: string };
    if (!body.access_token) throw new Error(`获取 access_token 失败 errcode=${body.errcode} errmsg=${body.errmsg}`);
    await this.redis.set(TOKEN_KEY, body.access_token, 'EX', Math.max(60, (body.expires_in ?? 7200) - 300));
    return body.access_token;
  }

  /**
   * 文本内容安全检测（用户评价等 UGC 必须接入）。
   * 本地开发（WX_MOCK_LOGIN）直接通过；接口异常返回 error，由调用方转人工审核，不阻断用户提交。
   */
  async msgSecCheck(openid: string, content: string): Promise<SecSuggest> {
    if (this.config.get('wechat', { infer: true }).mockLogin) return 'pass';
    try {
      const token = await this.accessToken();
      const res = await fetch(`https://api.weixin.qq.com/wxa/msg_sec_check?access_token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, version: 2, scene: SCENE_COMMENT, openid }),
      });
      const body = (await res.json()) as { errcode?: number; errmsg?: string; result?: { suggest?: string } };
      if (body.errcode === 40001 || body.errcode === 42001) await this.redis.del(TOKEN_KEY);
      const suggest = body.result?.suggest;
      if (body.errcode === 0 && (suggest === 'pass' || suggest === 'review' || suggest === 'risky')) return suggest;
      this.logger.warn(`msgSecCheck 返回异常 errcode=${body.errcode} errmsg=${body.errmsg}`);
      return 'error';
    } catch (e) {
      this.logger.warn(`msgSecCheck 调用失败：${(e as Error).message}`);
      return 'error';
    }
  }

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
