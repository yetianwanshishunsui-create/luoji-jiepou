import type { IdentityType, LessonType, PageResult, PricingMode, ProductType } from '@luoji/shared';
import { request } from './http';

export type PublishStatus = 'DRAFT' | 'ONLINE' | 'OFFLINE';

export interface CategoryNode {
  id: string;
  parentId: string | null;
  name: string;
  sort: number;
  enabled: boolean;
  visibleTo: IdentityType[];
  productCount: number;
  children?: CategoryNode[];
}

export interface CategoryForm {
  name: string;
  parentId: string | null;
  sort: number;
  enabled: boolean;
  visibleTo: IdentityType[];
}

export interface ProductRow {
  id: string;
  type: ProductType;
  title: string;
  cover: string | null;
  pricingMode: PricingMode;
  priceCent: number;
  status: PublishStatus;
  sort: number;
  visibleTo: IdentityType[];
  updatedAt: string;
  category: { id: string; name: string } | null;
  _count: { chapters: number; children: number; sessions: number; entitlements: number };
}

export interface ProductForm {
  title: string;
  subtitle: string | null;
  cover: string | null;
  detailHtml: string | null;
  pricingMode: PricingMode;
  priceCent: number;
  originCent: number | null;
  visibleTo: IdentityType[];
  categoryId: string | null;
  sort: number;
}

export interface Lesson {
  id: string;
  chapterId: string;
  type: LessonType;
  title: string;
  vodFileId: string | null;
  audioKey: string | null;
  contentHtml: string | null;
  duration: number;
  isTrial: boolean;
  trialSeconds: number;
  sort: number;
}

export type LessonForm = Omit<Lesson, 'id' | 'chapterId' | 'sort'>;

export interface Chapter {
  id: string;
  title: string;
  sort: number;
  lessons: Lesson[];
}

export interface OfflineSession {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  address: string;
  quota: number;
  depositCent: number;
  balanceCent: number;
  balanceDueAt: string;
  enabled: boolean;
  _count?: { enrollments: number };
}

export type SessionForm = Omit<OfflineSession, 'id' | '_count'>;

export interface ProductDetail extends ProductForm {
  id: string;
  type: ProductType;
  status: PublishStatus;
  category: { id: string; name: string; parentId: string | null } | null;
  chapters: Chapter[];
  children: { id: string; sort: number; childProduct: { id: string; title: string; type: ProductType; status: PublishStatus; priceCent: number } }[];
  sessions: OfflineSession[];
  _count: { orderItems: number; entitlements: number };
}

export interface DailyAudio {
  id: string;
  publishDate: string;
  title: string;
  audioKey: string;
  duration: number;
  visibleTo: IdentityType[];
  status: PublishStatus;
}

export type DailyAudioForm = Omit<DailyAudio, 'id'>;

const BASE = '/admin/v1/content';

export const contentApi = {
  // 分类
  categories: () => request<CategoryNode[]>({ url: `${BASE}/categories` }),
  createCategory: (data: CategoryForm) => request<CategoryNode>({ url: `${BASE}/categories`, method: 'POST', data }),
  updateCategory: (id: string, data: CategoryForm) => request<CategoryNode>({ url: `${BASE}/categories/${id}`, method: 'PUT', data }),
  deleteCategory: (id: string) => request<boolean>({ url: `${BASE}/categories/${id}`, method: 'DELETE' }),

  // 课程
  products: (params: { page: number; pageSize: number; type?: ProductType; status?: PublishStatus; categoryId?: string; keyword?: string }) =>
    request<PageResult<ProductRow>>({ url: `${BASE}/products`, params }),
  product: (id: string) => request<ProductDetail>({ url: `${BASE}/products/${id}` }),
  createProduct: (data: ProductForm & { type: ProductType }) => request<{ id: string }>({ url: `${BASE}/products`, method: 'POST', data }),
  updateProduct: (id: string, data: ProductForm) => request<{ id: string }>({ url: `${BASE}/products/${id}`, method: 'PUT', data }),
  setStatus: (id: string, status: PublishStatus) =>
    request<{ id: string; status: PublishStatus }>({ url: `${BASE}/products/${id}/status`, method: 'PATCH', data: { status } }),
  deleteProduct: (id: string) => request<boolean>({ url: `${BASE}/products/${id}`, method: 'DELETE' }),
  setItems: (id: string, childProductIds: string[]) =>
    request<boolean>({ url: `${BASE}/products/${id}/items`, method: 'PUT', data: { childProductIds } }),

  // 目录
  createChapter: (productId: string, title: string) =>
    request<Chapter>({ url: `${BASE}/products/${productId}/chapters`, method: 'POST', data: { title } }),
  updateChapter: (id: string, title: string) => request<Chapter>({ url: `${BASE}/chapters/${id}`, method: 'PUT', data: { title } }),
  deleteChapter: (id: string) => request<boolean>({ url: `${BASE}/chapters/${id}`, method: 'DELETE' }),
  sortChapters: (productId: string, ids: string[]) =>
    request<boolean>({ url: `${BASE}/products/${productId}/chapters/sort`, method: 'PUT', data: { ids } }),
  createLesson: (chapterId: string, data: LessonForm) =>
    request<Lesson>({ url: `${BASE}/chapters/${chapterId}/lessons`, method: 'POST', data }),
  updateLesson: (id: string, data: LessonForm) => request<Lesson>({ url: `${BASE}/lessons/${id}`, method: 'PUT', data }),
  deleteLesson: (id: string) => request<boolean>({ url: `${BASE}/lessons/${id}`, method: 'DELETE' }),
  sortLessons: (chapterId: string, ids: string[]) =>
    request<boolean>({ url: `${BASE}/chapters/${chapterId}/lessons/sort`, method: 'PUT', data: { ids } }),

  // 线下课场次
  createSession: (productId: string, data: SessionForm) =>
    request<OfflineSession>({ url: `${BASE}/products/${productId}/sessions`, method: 'POST', data }),
  updateSession: (id: string, data: SessionForm) => request<OfflineSession>({ url: `${BASE}/sessions/${id}`, method: 'PUT', data }),
  deleteSession: (id: string) => request<boolean>({ url: `${BASE}/sessions/${id}`, method: 'DELETE' }),

  // 每日音频
  dailyAudios: (params: { page: number; pageSize: number; status?: PublishStatus }) =>
    request<PageResult<DailyAudio>>({ url: `${BASE}/daily-audios`, params }),
  createDailyAudio: (data: DailyAudioForm) => request<DailyAudio>({ url: `${BASE}/daily-audios`, method: 'POST', data }),
  updateDailyAudio: (id: string, data: DailyAudioForm) => request<DailyAudio>({ url: `${BASE}/daily-audios/${id}`, method: 'PUT', data }),
  deleteDailyAudio: (id: string) => request<boolean>({ url: `${BASE}/daily-audios/${id}`, method: 'DELETE' }),
};

export const PublishStatusLabel: Record<PublishStatus, string> = { DRAFT: '草稿', ONLINE: '已上架', OFFLINE: '已下架' };
export const PublishStatusTag: Record<PublishStatus, 'info' | 'success' | 'warning'> = { DRAFT: 'info', ONLINE: 'success', OFFLINE: 'warning' };
export const LessonTypeLabel: Record<LessonType, string> = { VIDEO: '视频', AUDIO: '音频', ARTICLE: '图文' };
