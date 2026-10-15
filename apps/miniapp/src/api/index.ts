import type { CertStatus, EnrollmentStatus, IdentityType, JoinPageConfig, LoginResult, PageResult, ProductType, UserProfile } from '@luoji/shared';
import { request } from '@/utils/request';

export interface ProductCard {
  id: string;
  type: ProductType;
  title: string;
  subtitle: string | null;
  cover: string | null;
  pricingMode: 'FREE' | 'PAID';
  priceCent: number;
  originCent: number | null;
  currentPriceCent: number;
  /** 进行中的早鸟 / 限时价 */
  priceRule: { type: 'EARLY_BIRD' | 'LIMITED_TIME'; endAt: string } | null;
  /** 线下课：未开始场次中最低的定金 */
  minDepositCent?: number | null;
}

export interface OfflineSessionView {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  address: string;
  depositCent: number;
  balanceCent: number;
  balanceDueAt: string;
  quota: number;
  remaining: number;
  closed: boolean;
  myEnrollment: { id: string; status: EnrollmentStatus } | null;
}

export interface MyEnrollment {
  id: string;
  status: EnrollmentStatus;
  contactName: string;
  contactPhoneMasked: string;
  cancelReason: string | null;
  createdAt: string;
  product: { id: string; title: string; cover: string | null };
  session: Pick<OfflineSessionView, 'id' | 'title' | 'startAt' | 'endAt' | 'address' | 'depositCent' | 'balanceCent' | 'balanceDueAt'>;
  depositOrder: { orderNo: string; status: string; expireAt: string } | null;
  balanceOrder: { orderNo: string; status: string; expireAt: string } | null;
}

export interface CouponView {
  name: string;
  description: string | null;
  type: 'FULL_REDUCTION' | 'DIRECT';
  thresholdCent: number;
  discountCent: number;
  validTo: string;
}

export interface CenterCoupon extends CouponView {
  id: string;
  scope: 'ALL' | 'CATEGORY' | 'PRODUCT';
  validFrom: string;
  heldCount: number;
  soldOut: boolean;
  claimable: boolean;
  reason: string | null;
}

export interface MyCoupon extends CouponView {
  id: string;
  status: 'UNUSED' | 'LOCKED' | 'USED' | 'EXPIRED';
  scope: 'ALL' | 'CATEGORY' | 'PRODUCT';
  validFrom: string;
  usedAt: string | null;
}

export interface CheckoutPreview {
  productId: string;
  title: string;
  originCent: number;
  totalCent: number;
  priceRule: { type: 'EARLY_BIRD' | 'LIMITED_TIME'; priceCent: number; endAt: string } | null;
  bestUserCouponId: string | null;
  coupons: (Omit<CouponView, 'discountCent'> & { userCouponId: string; faceCent: number; discountCent: number; reason: string | null })[];
}

export interface LessonBrief {
  id: string;
  type: 'VIDEO' | 'AUDIO' | 'ARTICLE';
  title: string;
  duration: number;
  isTrial: boolean;
  trialSeconds: number;
}

export interface ProductDetail extends ProductCard {
  detailHtml: string | null;
  owned: boolean;
  chapters: { id: string; title: string; lessons: LessonBrief[] }[];
  items: { id: string; title: string; cover: string | null; type: ProductType }[];
}

export interface PlaySign {
  lessonId: string;
  type: LessonBrief['type'];
  access: { mode: 'FULL' } | { mode: 'TRIAL'; trialSeconds: number };
  resumeAt: number;
  fileId: string | null;
  psign: string | null;
  contentHtml: string | null;
}

export interface MyCourse {
  id: string;
  title: string;
  cover: string | null;
  lessonCount: number;
  completedCount: number;
  progress: number;
  lastLessonId: string | null;
}

export interface Category {
  id: string;
  name: string;
  children: { id: string; name: string }[];
}

export const api = {
  wxLogin: (code: string) => request<LoginResult>({ url: '/api/v1/auth/wx-login', method: 'POST', data: { code }, silent: true }),
  me: () => request<UserProfile>({ url: '/api/v1/me' }),

  certMine: () =>
    request<{
      certStatus: CertStatus;
      identityType: IdentityType | null;
      latest: { status: CertStatus; rejectReason: string | null } | null;
    }>({ url: '/api/v1/cert' }),
  certUploadSign: () => request<unknown>({ url: '/api/v1/cert/upload-sign', method: 'POST', silent: true }),
  certSubmit: (data: { identityType: IdentityType; realName: string; licenseNo?: string; organization?: string; files: string[] }) =>
    request<{ id: string }>({ url: '/api/v1/cert/submit', method: 'POST', data }),

  home: () =>
    request<{ banners: { id: string; title: string; image: string; link: string | null }[]; sections: { title: string; products: ProductCard[] }[] }>({
      url: '/api/v1/home',
      silent: true,
    }),
  joinPage: () => request<JoinPageConfig>({ url: '/api/v1/site/join', silent: true }),
  categories: () => request<Category[]>({ url: '/api/v1/categories' }),
  products: (params: { page: number; pageSize: number; categoryId?: string }) =>
    request<PageResult<ProductCard>>({ url: '/api/v1/products', data: params }),
  product: (id: string) => request<ProductDetail>({ url: `/api/v1/products/${id}` }),

  playSign: (lessonId: string) => request<PlaySign>({ url: `/api/v1/lessons/${lessonId}/play-sign` }),
  reportProgress: (data: { lessonId: string; position: number; duration: number }) =>
    request<{ completed: boolean }>({ url: '/api/v1/progress', method: 'POST', data, silent: true }),
  myCourses: () => request<MyCourse[]>({ url: '/api/v1/learning/courses' }),

  checkoutPreview: (productId: string) => request<CheckoutPreview>({ url: '/api/v1/orders/preview', data: { productId } }),
  couponCenter: () => request<CenterCoupon[]>({ url: '/api/v1/coupons/center' }),
  claimCoupon: (id: string) => request<{ id: string }>({ url: `/api/v1/coupons/${id}/claim`, method: 'POST' }),
  myCoupons: (tab: 'usable' | 'used' | 'expired') => request<MyCoupon[]>({ url: '/api/v1/me/coupons', data: { tab } }),

  createOrder: (data: { productId: string; userCouponId?: string }) =>
    request<{ orderNo: string; payCent: number }>({ url: '/api/v1/orders', method: 'POST', data }),
  cancelOrder: (orderNo: string) => request<{ orderNo: string }>({ url: `/api/v1/orders/${orderNo}/cancel`, method: 'POST', silent: true }),
  payOrder: (orderNo: string) =>
    // 开发环境模拟支付（PAY_MOCK）返回 { mock: true }，订单已直接支付成功
    request<{ timeStamp: string; nonceStr: string; package: string; signType: string; paySign: string } | { mock: true }>({
      url: `/api/v1/orders/${orderNo}/pay`,
      method: 'POST',
    }),
  orders: (params: { page: number; pageSize: number }) =>
    request<PageResult<{ orderNo: string; status: string; payCent: number; refundedCent: number; createdAt: string; items: { title: string }[] }>>({
      url: '/api/v1/orders',
      data: params,
    }),

  offlineSessions: (productId: string) => request<OfflineSessionView[]>({ url: `/api/v1/offline/products/${productId}/sessions` }),
  enroll: (sessionId: string, data: { name: string; phone: string }) =>
    request<{ enrollmentId: string; orderNo: string; payCent: number }>({ url: `/api/v1/offline/sessions/${sessionId}/enroll`, method: 'POST', data }),
  payBalance: (enrollmentId: string) =>
    request<{ orderNo: string; payCent: number }>({ url: `/api/v1/offline/enrollments/${enrollmentId}/balance`, method: 'POST' }),
  cancelEnrollment: (enrollmentId: string) => request<boolean>({ url: `/api/v1/offline/enrollments/${enrollmentId}/cancel`, method: 'POST' }),
  myEnrollments: () => request<MyEnrollment[]>({ url: '/api/v1/offline/enrollments' }),

  submitLead: (data: { name: string; phone: string; city?: string; organization?: string; intention?: string }) =>
    request<{ id: string }>({ url: '/api/v1/leads', method: 'POST', data }),
};
