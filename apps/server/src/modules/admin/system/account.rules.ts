/**
 * 管理员账号规则（纯函数）
 */

/** 密码策略：8~64 位，同时包含字母和数字，不能与用户名相同 */
export function passwordProblem(password: string, username?: string): string | null {
  if (password.length < 8 || password.length > 64) return '密码长度需为 8~64 位';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return '密码需同时包含字母和数字';
  if (username && password.toLowerCase() === username.toLowerCase()) return '密码不能与用户名相同';
  return null;
}

/**
 * 修改角色 / 停用后是否会导致没有可用的超级管理员。
 * activeSuperCount 为当前启用中的超级管理员数量（含 target 本身）。
 */
export function losesLastSuperAdmin(
  target: { role: string; disabled: boolean },
  next: { role: string; disabled: boolean },
  activeSuperCount: number,
): boolean {
  const wasActiveSuper = target.role === 'SUPER_ADMIN' && !target.disabled;
  const isActiveSuper = next.role === 'SUPER_ADMIN' && !next.disabled;
  return wasActiveSuper && !isActiveSuper && activeSuperCount <= 1;
}

/** 登录失败锁定策略 */
export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_LOCK_SECONDS = 15 * 60;
