/**
 * 集中读取环境变量。业务代码通过 ConfigService.get('xxx', { infer: true }) 取值，
 * 不直接访问 process.env。
 */
export interface AppConfig {
  env: string;
  port: number;
  corsOrigins: string[];
  redisUrl: string;
  jwt: {
    userSecret: string;
    adminSecret: string;
    accessTtl: string;
    refreshTtl: string;
  };
  crypto: {
    encryptionKey: string;
    hashSalt: string;
  };
  wechat: {
    appId: string;
    secret: string;
    mockLogin: boolean;
  };
  pay: {
    /** 模拟支付 / 退款（仅开发环境，商户号开通前用于联调） */
    mock: boolean;
  };
}

export default (): AppConfig => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  corsOrigins: (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  redisUrl: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379/0',
  jwt: {
    userSecret: process.env.JWT_USER_SECRET ?? '',
    adminSecret: process.env.JWT_ADMIN_SECRET ?? '',
    accessTtl: process.env.JWT_ACCESS_TTL ?? '2h',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '30d',
  },
  crypto: {
    encryptionKey: process.env.DATA_ENCRYPTION_KEY ?? '',
    hashSalt: process.env.DATA_HASH_SALT ?? '',
  },
  wechat: {
    appId: process.env.WX_APPID ?? '',
    secret: process.env.WX_SECRET ?? '',
    mockLogin: process.env.WX_MOCK_LOGIN === 'true',
  },
  pay: {
    mock: process.env.PAY_MOCK === 'true',
  },
});

/** 启动时校验必填项，缺失直接拒绝启动 */
export function validateEnv(env: Record<string, unknown>) {
  const required = ['DATABASE_URL', 'JWT_USER_SECRET', 'JWT_ADMIN_SECRET', 'DATA_ENCRYPTION_KEY', 'DATA_HASH_SALT'];
  const missing = required.filter((k) => !env[k]);
  if (missing.length) {
    throw new Error(`缺少必要环境变量：${missing.join(', ')}（参考 .env.example）`);
  }
  const key = Buffer.from(String(env.DATA_ENCRYPTION_KEY), 'base64');
  if (key.length !== 32) {
    throw new Error('DATA_ENCRYPTION_KEY 必须是 32 字节密钥的 base64（openssl rand -base64 32）');
  }
  if (env.NODE_ENV === 'production' && env.WX_MOCK_LOGIN === 'true') {
    throw new Error('生产环境禁止开启 WX_MOCK_LOGIN');
  }
  if (env.NODE_ENV === 'production' && env.PAY_MOCK === 'true') {
    throw new Error('生产环境禁止开启 PAY_MOCK');
  }
  return env;
}
