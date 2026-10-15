import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';
import type { AppConfig } from '../../config/configuration';

const VERSION = 'v1';
const IV_LEN = 12;
const TAG_LEN = 16;

/**
 * 敏感字段加密（AES-256-GCM）与检索哈希（HMAC-SHA256）。
 * 密文格式：v1:<base64(iv | tag | ciphertext)>，版本前缀便于将来轮换密钥。
 */
@Injectable()
export class CryptoService {
  private readonly key: Buffer;
  private readonly salt: string;

  constructor(config: ConfigService<AppConfig, true>) {
    const { encryptionKey, hashSalt } = config.get('crypto', { infer: true });
    this.key = Buffer.from(encryptionKey, 'base64');
    this.salt = hashSalt;
  }

  encrypt(plain: string): string {
    const iv = randomBytes(IV_LEN);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${VERSION}:${Buffer.concat([iv, tag, enc]).toString('base64')}`;
  }

  decrypt(payload: string): string {
    const [version, body] = payload.split(':');
    if (version !== VERSION || !body) throw new Error('不支持的密文格式');
    const buf = Buffer.from(body, 'base64');
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const enc = buf.subarray(IV_LEN + TAG_LEN);
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
  }

  /** 用于唯一性校验与精确检索，不可逆 */
  hash(value: string): string {
    return createHmac('sha256', this.salt).update(value.trim()).digest('hex');
  }

  static maskPhone(phone: string): string {
    return phone.length >= 7 ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : '****';
  }
}
