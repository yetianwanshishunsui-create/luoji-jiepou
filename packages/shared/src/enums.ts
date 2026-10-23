/**
 * 业务枚举。与 apps/server/prisma/schema.prisma 中的 enum 保持同名同值。
 * 用 const 对象而不是 TS enum，前端打包后体积更小，也便于遍历生成下拉选项。
 */

/** 用户身份 */
export const IdentityType = {
  DOCTOR: 'DOCTOR',
  PRACTITIONER: 'PRACTITIONER',
} as const;
export type IdentityType = (typeof IdentityType)[keyof typeof IdentityType];

/** 认证状态 */
export const CertStatus = {
  UNSUBMITTED: 'UNSUBMITTED',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  REVOKED: 'REVOKED',
} as const;
export type CertStatus = (typeof CertStatus)[keyof typeof CertStatus];

/** 产品类型 */
export const ProductType = {
  COURSE: 'COURSE',
  COLUMN: 'COLUMN',
  SERIES: 'SERIES',
  OFFLINE: 'OFFLINE',
} as const;
export type ProductType = (typeof ProductType)[keyof typeof ProductType];

/** 定价模式 */
export const PricingMode = {
  FREE: 'FREE',
  PAID: 'PAID',
} as const;
export type PricingMode = (typeof PricingMode)[keyof typeof PricingMode];

/** 课时类型 */
export const LessonType = {
  VIDEO: 'VIDEO',
  AUDIO: 'AUDIO',
  ARTICLE: 'ARTICLE',
} as const;
export type LessonType = (typeof LessonType)[keyof typeof LessonType];

/** 订单状态 */
export const OrderStatus = {
  CREATED: 'CREATED',
  PAID: 'PAID',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
  REFUNDING: 'REFUNDING',
  REFUNDED: 'REFUNDED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

/** 订单用途 */
export const OrderPurpose = {
  PRODUCT: 'PRODUCT',
  OFFLINE_DEPOSIT: 'OFFLINE_DEPOSIT',
  OFFLINE_BALANCE: 'OFFLINE_BALANCE',
} as const;
export type OrderPurpose = (typeof OrderPurpose)[keyof typeof OrderPurpose];

/** 退款状态 */
export const RefundStatus = {
  PROCESSING: 'PROCESSING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
} as const;
export type RefundStatus = (typeof RefundStatus)[keyof typeof RefundStatus];

/** 线下课报名状态 */
export const EnrollmentStatus = {
  DEPOSIT_PENDING: 'DEPOSIT_PENDING',
  DEPOSIT_PAID: 'DEPOSIT_PAID',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type EnrollmentStatus = (typeof EnrollmentStatus)[keyof typeof EnrollmentStatus];

/** 课程评价状态 */
export const ReviewStatus = {
  PENDING: 'PENDING',
  VISIBLE: 'VISIBLE',
  HIDDEN: 'HIDDEN',
} as const;
export type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus];

/** 招商线索状态 */
export const LeadStatus = {
  NEW: 'NEW',
  CONTACTED: 'CONTACTED',
  CONVERTED: 'CONVERTED',
  INVALID: 'INVALID',
} as const;
export type LeadStatus = (typeof LeadStatus)[keyof typeof LeadStatus];

/** 后台角色 */
export const AdminRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  OPERATOR: 'OPERATOR',
  REVIEWER: 'REVIEWER',
  FINANCE: 'FINANCE',
} as const;
export type AdminRole = (typeof AdminRole)[keyof typeof AdminRole];
