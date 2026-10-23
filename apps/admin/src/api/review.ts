import type { IdentityType, PageResult, ReviewStatus } from '@luoji/shared';
import { request } from './http';

export interface ReviewRow {
  id: string;
  productId: string;
  rating: number;
  content: string;
  anonymous: boolean;
  status: ReviewStatus;
  featured: boolean;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
  updatedAt: string;
  product: { id: string; title: string };
  user: { id: string; nickname: string | null; phoneMasked: string | null; identityType: IdentityType | null };
}

export interface ReviewQuery {
  page: number;
  pageSize: number;
  status?: ReviewStatus;
  rating?: number;
  keyword?: string;
}

export const reviewApi = {
  list: (params: ReviewQuery) => request<PageResult<ReviewRow> & { pending: number }>({ url: '/admin/v1/reviews', params }),
  update: (id: string, data: { status?: ReviewStatus; featured?: boolean; reply?: string }) =>
    request<ReviewRow>({ url: `/admin/v1/reviews/${id}`, method: 'PATCH', data }),
};
