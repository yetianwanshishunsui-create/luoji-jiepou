import type { PageResult } from '@luoji/shared';
import { request } from './http';

export type RuleType = 'EARLY_BIRD' | 'LIMITED_TIME';
export type CouponType = 'FULL_REDUCTION' | 'DIRECT';
export type CouponScope = 'ALL' | 'CATEGORY' | 'PRODUCT';
export type UserCouponStatus = 'UNUSED' | 'LOCKED' | 'USED' | 'EXPIRED';

export interface PriceRule {
  id: string;
  productId: string;
  type: RuleType;
  priceCent: number;
  startAt: string;
  endAt: string;
  enabled: boolean;
  product: { id: string; title: string; priceCent: number; status: string };
}

export type PriceRuleForm = Pick<PriceRule, 'productId' | 'type' | 'priceCent' | 'startAt' | 'endAt' | 'enabled'>;

export interface CouponForm {
  name: string;
  description: string | null;
  type: CouponType;
  thresholdCent: number;
  discountCent: number;
  scope: CouponScope;
  scopeIds: string[];
  totalCount: number;
  perUserLimit: number;
  claimable: boolean;
  validFrom: string;
  validTo: string;
  enabled: boolean;
}

export interface Coupon extends CouponForm {
  id: string;
  issuedCount: number;
  usedCount: number;
  createdAt: string;
}

export interface CouponDetail extends Coupon {
  scopeItems: { id: string; title: string }[];
}

export interface CouponRecord {
  id: string;
  status: UserCouponStatus;
  claimedAt: string;
  usedAt: string | null;
  user: { id: string; nickname: string | null; phoneMasked: string | null };
  order: { orderNo: string; status: string } | null;
}

const BASE = '/admin/v1/marketing';

export const marketingApi = {
  priceRules: (params: { page: number; pageSize: number; productId?: string; phase?: string }) =>
    request<PageResult<PriceRule>>({ url: `${BASE}/price-rules`, params }),
  createPriceRule: (data: PriceRuleForm) => request<PriceRule>({ url: `${BASE}/price-rules`, method: 'POST', data }),
  updatePriceRule: (id: string, data: PriceRuleForm) => request<PriceRule>({ url: `${BASE}/price-rules/${id}`, method: 'PUT', data }),
  deletePriceRule: (id: string) => request<boolean>({ url: `${BASE}/price-rules/${id}`, method: 'DELETE' }),

  coupons: (params: { page: number; pageSize: number; phase?: string; keyword?: string }) =>
    request<PageResult<Coupon>>({ url: `${BASE}/coupons`, params }),
  coupon: (id: string) => request<CouponDetail>({ url: `${BASE}/coupons/${id}` }),
  createCoupon: (data: CouponForm) => request<Coupon>({ url: `${BASE}/coupons`, method: 'POST', data }),
  updateCoupon: (id: string, data: CouponForm) => request<Coupon>({ url: `${BASE}/coupons/${id}`, method: 'PUT', data }),
  setCouponEnabled: (id: string, enabled: boolean) =>
    request<{ id: string; enabled: boolean }>({ url: `${BASE}/coupons/${id}/enabled`, method: 'PATCH', data: { enabled } }),
  issueCoupon: (id: string, targets: string[]) =>
    request<{ issued: number; notFound: string[]; quotaExhausted: boolean }>({ url: `${BASE}/coupons/${id}/issue`, method: 'POST', data: { targets } }),
  couponRecords: (id: string, params: { page: number; pageSize: number; status?: UserCouponStatus }) =>
    request<PageResult<CouponRecord>>({ url: `${BASE}/coupons/${id}/records`, params }),
};

export const RuleTypeLabel: Record<RuleType, string> = { EARLY_BIRD: '早鸟价', LIMITED_TIME: '限时价' };
export const CouponScopeLabel: Record<CouponScope, string> = { ALL: '全部课程', CATEGORY: '指定分类', PRODUCT: '指定课程' };
export const UserCouponStatusLabel: Record<UserCouponStatus, string> = { UNUSED: '未使用', LOCKED: '下单锁定', USED: '已使用', EXPIRED: '已过期' };

/** 券面文案：立减 ¥20 / 满 ¥150 减 ¥50 */
export function couponFace(c: Pick<CouponForm, 'type' | 'thresholdCent' | 'discountCent'>): string {
  const y = (n: number) => (n / 100).toFixed(n % 100 ? 2 : 0);
  return c.type === 'DIRECT' ? `立减 ¥${y(c.discountCent)}` : `满 ¥${y(c.thresholdCent)} 减 ¥${y(c.discountCent)}`;
}

/** 时间窗阶段 */
export function phaseOf(x: { startAt?: string; endAt?: string; validFrom?: string; validTo?: string; enabled: boolean }) {
  if (!x.enabled) return { label: '已停用', type: 'info' as const };
  const now = Date.now();
  const start = new Date((x.startAt ?? x.validFrom)!).getTime();
  const end = new Date((x.endAt ?? x.validTo)!).getTime();
  if (now < start) return { label: '未开始', type: 'warning' as const };
  if (now >= end) return { label: '已结束', type: 'info' as const };
  return { label: '进行中', type: 'success' as const };
}
