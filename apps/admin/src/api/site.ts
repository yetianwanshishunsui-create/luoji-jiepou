import type { BannerPosition, IdentityType, JoinPageConfig, ProductType } from '@luoji/shared';
import { request } from './http';

export interface Banner {
  id: string;
  position: BannerPosition;
  title: string;
  image: string;
  link: string | null;
  identityType: IdentityType | null;
  sort: number;
  onlineAt: string | null;
  offlineAt: string | null;
  enabled: boolean;
  updatedAt: string;
}

export type BannerForm = Omit<Banner, 'id' | 'updatedAt'>;

export interface SlotProduct {
  id: string;
  title: string;
  cover?: string | null;
  type?: ProductType;
  status?: string;
  priceCent?: number;
  missing: boolean;
  warning: string | null;
}

export interface HomeSlotsView {
  updatedAt: string | null;
  sections: { title: string; products: SlotProduct[] }[];
}

export const siteApi = {
  banners: () => request<Banner[]>({ url: '/admin/v1/site/banners' }),
  createBanner: (data: BannerForm) => request<Banner>({ url: '/admin/v1/site/banners', method: 'POST', data }),
  updateBanner: (id: string, data: BannerForm) => request<Banner>({ url: `/admin/v1/site/banners/${id}`, method: 'PUT', data }),
  deleteBanner: (id: string) => request<boolean>({ url: `/admin/v1/site/banners/${id}`, method: 'DELETE' }),

  homeSlots: (identity: IdentityType) => request<HomeSlotsView>({ url: `/admin/v1/site/home-slots/${identity}` }),
  saveHomeSlots: (identity: IdentityType, sections: { title: string; productIds: string[] }[]) =>
    request<HomeSlotsView>({ url: `/admin/v1/site/home-slots/${identity}`, method: 'PUT', data: { sections } }),

  joinPage: () => request<{ value: JoinPageConfig; updatedAt: string | null }>({ url: '/admin/v1/site/join-page' }),
  saveJoinPage: (data: JoinPageConfig) =>
    request<{ value: JoinPageConfig; updatedAt: string | null }>({ url: '/admin/v1/site/join-page', method: 'PUT', data }),
};
