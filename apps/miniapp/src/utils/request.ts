import { ErrorCode, type ApiResponse } from '@luoji/shared';
import { API_BASE } from './config';
import { tokenStorage } from './storage';

export class ApiError extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

interface Options {
  url: string;
  /** 微信小程序 wx.request 不支持 PATCH */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: Record<string, unknown> | object;
  /** 出错时不弹 toast（调用方自行处理） */
  silent?: boolean;
  /** 内部使用：已尝试刷新 token */
  retried?: boolean;
}

/** 登录失效时由 user store 注入的重新登录方法，避免循环依赖 */
let relogin: (() => Promise<void>) | null = null;
export function setReloginHandler(fn: () => Promise<void>) {
  relogin = fn;
}

let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const tokens = tokenStorage.get();
  if (!tokens?.refreshToken) return false;
  refreshing ??= raw<{ accessToken: string; refreshToken: string }>({
    url: '/api/v1/auth/refresh',
    method: 'POST',
    data: { refreshToken: tokens.refreshToken },
  })
    .then((res) => {
      tokenStorage.set(res);
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/** 演示版：接口在本机模拟（见 src/demo），不请求服务器 */
const DEMO = import.meta.env.VITE_DEMO === 'true';

async function demoRaw<T>(opts: Options): Promise<T> {
  const { mockRequest } = await import('@/demo/mock');
  try {
    return (await mockRequest(opts.method ?? 'GET', opts.url, (opts.data ?? {}) as Record<string, unknown>)) as T;
  } catch (e) {
    const err = e as { code?: number; message?: string; status?: number };
    throw new ApiError(err.code ?? ErrorCode.INTERNAL, err.message ?? '请求失败', err.status ?? 500);
  }
}

function raw<T>(opts: Options): Promise<T> {
  if (DEMO) return demoRaw<T>(opts);
  const tokens = tokenStorage.get();
  return new Promise((resolve, reject) => {
    uni.request({
      url: API_BASE + opts.url,
      method: opts.method ?? 'GET',
      data: opts.data,
      header: tokens?.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {},
      timeout: 15_000,
      success: (res) => {
        const body = res.data as ApiResponse<T>;
        if (res.statusCode >= 200 && res.statusCode < 300 && body?.code === 0) resolve(body.data);
        else reject(new ApiError(body?.code ?? ErrorCode.INTERNAL, body?.message ?? '请求失败', res.statusCode));
      },
      fail: () => reject(new ApiError(ErrorCode.INTERNAL, '网络异常，请检查网络', 0)),
    });
  });
}

/**
 * 统一请求：
 * - 401 → 先用 refresh token 换新，失败则重新静默登录，然后重试一次
 * - 20001 未认证 → 跳转认证页；20002 审核中 → 提示
 */
export async function request<T>(opts: Options): Promise<T> {
  try {
    return await raw<T>(opts);
  } catch (e) {
    const err = e as ApiError;

    if (err.status === 401 && !opts.retried) {
      const ok = (await tryRefresh()) || (relogin ? await relogin().then(() => true, () => false) : false);
      if (ok) return request<T>({ ...opts, retried: true });
    }

    if (err.code === ErrorCode.CERT_REQUIRED) {
      uni.navigateTo({ url: '/pages/cert/index' });
    } else if (!opts.silent) {
      uni.showToast({ title: err.message, icon: 'none' });
    }
    throw err;
  }
}
