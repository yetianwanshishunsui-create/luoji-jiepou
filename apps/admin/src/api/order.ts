import type { IdentityType, OrderPurpose, OrderStatus, PageResult, ProductType, RefundStatus } from '@luoji/shared';
import { download, request } from './http';

export interface OrderRow {
  id: string;
  orderNo: string;
  purpose: OrderPurpose;
  status: OrderStatus;
  totalCent: number;
  discountCent: number;
  payCent: number;
  refundedCent: number;
  paidAt: string | null;
  expireAt: string;
  createdAt: string;
  user: { id: string; nickname: string | null; phoneMasked: string | null };
  items: { productId: string; title: string; priceCent: number }[];
}

export interface RefundRecord {
  id: string;
  refundNo: string;
  amountCent: number;
  status: RefundStatus;
  reason: string | null;
  revokeEntitlement: boolean;
  wxRefundId: string | null;
  failReason: string | null;
  operatorName: string | null;
  createdAt: string;
  finishedAt: string | null;
}

export interface OrderDetail extends Omit<OrderRow, 'items' | 'user'> {
  wxTransactionId: string | null;
  closedAt: string | null;
  remark: string | null;
  user: OrderRow['user'] & { identityType: IdentityType | null };
  items: { id: string; productId: string; title: string; priceCent: number; quantity: number; product: { id: string; type: ProductType } }[];
  refunds: RefundRecord[];
  entitlements: { productId: string; createdAt: string }[];
  coupon: { name: string; status: string } | null;
}

export interface OrderQuery {
  page: number;
  pageSize: number;
  status?: OrderStatus;
  purpose?: OrderPurpose;
  keyword?: string;
  from?: string;
  to?: string;
}

export interface OrderSummary {
  paidCount: number;
  paidCent: number;
  refundedCent: number;
}

export const orderApi = {
  list: (params: OrderQuery) => request<PageResult<OrderRow> & { summary: OrderSummary }>({ url: '/admin/v1/orders', params }),
  detail: (orderNo: string) => request<OrderDetail>({ url: `/admin/v1/orders/${orderNo}` }),
  refund: (orderNo: string, data: { amountCent: number; reason: string; revokeEntitlement: boolean }) =>
    request<RefundRecord>({ url: `/admin/v1/orders/${orderNo}/refunds`, method: 'POST', data }),
  syncRefund: (refundNo: string) => request<RefundRecord>({ url: `/admin/v1/refunds/${refundNo}/sync`, method: 'POST' }),
  export: (params: Omit<OrderQuery, 'page' | 'pageSize'>) => download('/admin/v1/orders/export', { ...params }),
};
