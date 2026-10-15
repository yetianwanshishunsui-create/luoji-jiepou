import type { OrderStatus, RefundStatus } from '@luoji/shared';

type TagType = 'info' | 'success' | 'warning' | 'danger' | 'primary';

export const OrderStatusTag: Record<OrderStatus, TagType> = {
  CREATED: 'warning',
  PAID: 'success',
  CLOSED: 'info',
  CANCELLED: 'info',
  REFUNDING: 'danger',
  REFUNDED: 'info',
};

export const RefundStatusTag: Record<RefundStatus, TagType> = {
  PROCESSING: 'warning',
  SUCCESS: 'success',
  FAILED: 'danger',
};
