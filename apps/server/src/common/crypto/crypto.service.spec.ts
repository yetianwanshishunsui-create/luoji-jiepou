import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { CryptoService } from './crypto.service';

function make(key = randomBytes(32).toString('base64')) {
  const config = { get: () => ({ encryptionKey: key, hashSalt: 'salt' }) } as unknown as ConfigService;
  return new CryptoService(config as never);
}

describe('CryptoService', () => {
  const svc = make();

  it('加密后可解密，且每次密文不同', () => {
    const a = svc.encrypt('13800138000');
    const b = svc.encrypt('13800138000');
    expect(a).not.toEqual(b);
    expect(a.startsWith('v1:')).toBe(true);
    expect(svc.decrypt(a)).toBe('13800138000');
  });

  it('密文被篡改时解密失败', () => {
    const enc = svc.encrypt('secret');
    const buf = Buffer.from(enc.slice(3), 'base64');
    buf[buf.length - 1] ^= 0xff;
    expect(() => svc.decrypt(`v1:${buf.toString('base64')}`)).toThrow();
  });

  it('不同密钥无法解密', () => {
    expect(() => make().decrypt(svc.encrypt('x'))).toThrow();
  });

  it('哈希稳定且忽略首尾空格', () => {
    expect(svc.hash(' 13800138000 ')).toBe(svc.hash('13800138000'));
  });

  it('手机号脱敏', () => {
    expect(CryptoService.maskPhone('13800138000')).toBe('138****8000');
  });
});
