import type { EnrollmentStatus } from '@luoji/shared';
import { download, request } from './http';

interface OrderBrief {
  orderNo: string;
  status: string;
  payCent: number;
  refundedCent: number;
  paidAt: string | null;
}

export interface EnrollmentRow {
  id: string;
  contactName: string;
  contactPhoneMasked: string;
  status: EnrollmentStatus;
  cancelReason: string | null;
  createdAt: string;
  user: { id: string; nickname: string | null };
  depositOrder: OrderBrief | null;
  balanceOrder: OrderBrief | null;
}

export interface EnrollmentList {
  session: { id: string; title: string; productTitle: string; quota: number; startAt: string };
  counts: Partial<Record<EnrollmentStatus, number>>;
  list: EnrollmentRow[];
}

export const offlineApi = {
  enrollments: (sessionId: string, status?: EnrollmentStatus) =>
    request<EnrollmentList>({ url: `/admin/v1/offline/sessions/${sessionId}/enrollments`, params: { status } }),
  phone: (id: string) => request<{ phone: string }>({ url: `/admin/v1/offline/enrollments/${id}/phone` }),
  cancel: (id: string, reason: string) =>
    request<{ id: string; status: string; needsRefund: boolean }>({ url: `/admin/v1/offline/enrollments/${id}/cancel`, method: 'POST', data: { reason } }),
  export: (sessionId: string) => download(`/admin/v1/offline/sessions/${sessionId}/enrollments/export`),
};
