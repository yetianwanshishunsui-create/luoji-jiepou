import type { AdminRole, PageResult } from '@luoji/shared';
import { request } from './http';

export interface AdminAccount {
  id: string;
  username: string;
  name: string;
  role: AdminRole;
  disabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  target: string | null;
  detail: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
  admin: { id: string; name: string; username: string } | null;
}

export const systemApi = {
  admins: () => request<AdminAccount[]>({ url: '/admin/v1/system/admins' }),
  createAdmin: (data: { username: string; name: string; role: AdminRole; password: string }) =>
    request<AdminAccount>({ url: '/admin/v1/system/admins', method: 'POST', data }),
  updateAdmin: (id: string, data: { name: string; role: AdminRole }) =>
    request<AdminAccount>({ url: `/admin/v1/system/admins/${id}`, method: 'PUT', data }),
  setDisabled: (id: string, disabled: boolean) =>
    request<AdminAccount>({ url: `/admin/v1/system/admins/${id}/disabled`, method: 'PATCH', data: { disabled } }),
  resetPassword: (id: string, password: string) =>
    request<boolean>({ url: `/admin/v1/system/admins/${id}/reset-password`, method: 'POST', data: { password } }),

  auditLogs: (params: { page: number; pageSize: number; adminId?: string; action?: string; target?: string; from?: string; to?: string }) =>
    request<PageResult<AuditLog>>({ url: '/admin/v1/system/audit-logs', params }),
  auditActions: () => request<{ action: string; count: number }[]>({ url: '/admin/v1/system/audit-logs/actions' }),

  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    request<boolean>({ url: '/admin/v1/auth/password', method: 'POST', data }),
};

/** 与后端 account.rules.ts 保持一致，提交前先在前端提示 */
export function passwordProblem(password: string, username?: string): string | null {
  if (password.length < 8 || password.length > 64) return '密码长度需为 8~64 位';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return '密码需同时包含字母和数字';
  if (username && password.toLowerCase() === username.toLowerCase()) return '密码不能与用户名相同';
  return null;
}

/** 操作日志动作的中文名；未收录的直接显示原始代码 */
export const AuditActionLabel: Record<string, string> = {
  ADMIN_LOGIN: '后台登录',
  ADMIN_LOGIN_FAIL: '登录失败',
  ADMIN_PASSWORD_CHANGE: '修改密码',
  ADMIN_CREATE: '新建管理员',
  ADMIN_UPDATE: '编辑管理员',
  ADMIN_DISABLE: '停用管理员',
  ADMIN_ENABLE: '启用管理员',
  ADMIN_RESET_PASSWORD: '重置管理员密码',
  CERT_VIEW: '查看认证资料',
  CERT_APPROVE: '认证通过',
  CERT_REJECT: '认证驳回',
  LEAD_UPDATE: '跟进线索',
  REVIEW_UPDATE: '处理课程评价',
  CATEGORY_CREATE: '新建分类',
  CATEGORY_UPDATE: '编辑分类',
  CATEGORY_DELETE: '删除分类',
  PRODUCT_CREATE: '新建课程',
  PRODUCT_UPDATE: '编辑课程',
  PRODUCT_STATUS: '课程上下架',
  PRODUCT_DELETE: '删除课程',
  PRODUCT_ITEMS: '设置专栏课程',
  CHAPTER_CREATE: '新建章节',
  CHAPTER_DELETE: '删除章节',
  LESSON_CREATE: '新建课时',
  LESSON_UPDATE: '编辑课时',
  LESSON_DELETE: '删除课时',
  SESSION_CREATE: '新建场次',
  SESSION_UPDATE: '编辑场次',
  SESSION_DELETE: '删除场次',
  DAILY_AUDIO_CREATE: '新建每日音频',
  DAILY_AUDIO_UPDATE: '编辑每日音频',
  DAILY_AUDIO_DELETE: '删除每日音频',
  ORDER_REFUND: '订单退款',
  ORDER_EXPORT: '导出订单',
  PRICE_RULE_CREATE: '新建价格策略',
  PRICE_RULE_UPDATE: '编辑价格策略',
  PRICE_RULE_DELETE: '删除价格策略',
  COUPON_CREATE: '新建优惠券',
  COUPON_UPDATE: '编辑优惠券',
  COUPON_ENABLE: '启用优惠券',
  COUPON_DISABLE: '停用优惠券',
  COUPON_ISSUE: '发放优惠券',
  BANNER_CREATE: '新建 Banner',
  BANNER_UPDATE: '编辑 Banner',
  BANNER_DELETE: '删除 Banner',
  HOME_SLOTS_UPDATE: '修改首页推荐',
  JOIN_PAGE_UPDATE: '修改招商页',
};
