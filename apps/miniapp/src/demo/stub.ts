/** 非演示构建时替换 ./mock（见 vite.config.ts），保证正式包不包含演示数据；这些函数只在 VITE_DEMO=true 时才会被调用 */
import type { IdentityType } from '@luoji/shared';

const unavailable = (): never => {
  throw new Error('演示后端仅在演示版构建中可用');
};

export const mockRequest = (_method: string, _url: string, _data?: Record<string, unknown>): Promise<unknown> => unavailable();
export const resetDemo = (): void => unavailable();
export const switchIdentity = (_identity: IdentityType): void => unavailable();
