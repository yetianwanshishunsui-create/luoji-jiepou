import type { AdminRole, CertStatus, IdentityType, LeadStatus, PageResult } from '@luoji/shared';
import { request } from './http';

export interface AdminProfile {
  id: string;
  name: string;
  role: AdminRole;
}

export interface CertRow {
  id: string;
  identityType: IdentityType;
  organization: string | null;
  status: CertStatus;
  rejectReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  user: { id: string; nickname: string | null; phoneMasked: string | null };
  reviewer: { name: string } | null;
}

export interface CertDetail extends Omit<CertRow, 'user' | 'reviewer'> {
  realName: string;
  licenseNo: string | null;
  fileUrls: string[];
  user: CertRow['user'];
}

export interface LeadRow {
  id: string;
  name: string;
  phoneMasked: string;
  city: string | null;
  organization: string | null;
  intention: string | null;
  status: LeadStatus;
  remark: string | null;
  createdAt: string;
}

export interface UserRow {
  id: string;
  nickname: string | null;
  avatar: string | null;
  phoneMasked: string | null;
  identityType: IdentityType | null;
  certStatus: CertStatus;
  disabled: boolean;
  createdAt: string;
}

export const api = {
  login: (data: { username: string; password: string }) =>
    request<{ accessToken: string; admin: AdminProfile }>({ url: '/admin/v1/auth/login', method: 'POST', data }),

  dashboard: () =>
    request<{ pendingCerts: number; todayOrders: number; todayPaidCent: number; todayLeads: number }>({
      url: '/admin/v1/dashboard',
    }),

  certifications: (params: { page: number; pageSize: number; status?: CertStatus }) =>
    request<PageResult<CertRow>>({ url: '/admin/v1/certifications', params }),
  certification: (id: string) => request<CertDetail>({ url: `/admin/v1/certifications/${id}` }),
  reviewCertification: (id: string, data: { action: 'APPROVE' | 'REJECT'; rejectReason?: string }) =>
    request({ url: `/admin/v1/certifications/${id}/review`, method: 'POST', data }),

  leads: (params: { page: number; pageSize: number; status?: LeadStatus }) =>
    request<PageResult<LeadRow>>({ url: '/admin/v1/leads', params }),
  updateLead: (id: string, data: { status?: LeadStatus; remark?: string }) =>
    request<LeadRow>({ url: `/admin/v1/leads/${id}`, method: 'PATCH', data }),

  users: (params: { page: number; pageSize: number; certStatus?: CertStatus }) =>
    request<PageResult<UserRow>>({ url: '/admin/v1/users', params }),
};
