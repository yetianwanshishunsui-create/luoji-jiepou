import type {
  AdminRole,
  CertStatus,
  EnrollmentStatus,
  IdentityType,
  LeadStatus,
  OrderPurpose,
  OrderStatus,
  ProductType,
  RefundStatus,
} from './enums';

export const IdentityTypeLabel: Record<IdentityType, string> = {
  DOCTOR: '医生',
  PRACTITIONER: '从业者',
};

export const CertStatusLabel: Record<CertStatus, string> = {
  UNSUBMITTED: '未认证',
  PENDING: '审核中',
  APPROVED: '已认证',
  REJECTED: '已驳回',
  REVOKED: '已撤销',
};

export const ProductTypeLabel: Record<ProductType, string> = {
  COURSE: '课程',
  COLUMN: '专栏',
  SERIES: '系列',
  OFFLINE: '线下课',
};

export const OrderStatusLabel: Record<OrderStatus, string> = {
  CREATED: '待支付',
  PAID: '已支付',
  CLOSED: '已关闭',
  CANCELLED: '已取消',
  REFUNDING: '退款中',
  REFUNDED: '已退款',
};

export const OrderPurposeLabel: Record<OrderPurpose, string> = {
  PRODUCT: '课程购买',
  OFFLINE_DEPOSIT: '线下课定金',
  OFFLINE_BALANCE: '线下课尾款',
};

export const RefundStatusLabel: Record<RefundStatus, string> = {
  PROCESSING: '退款中',
  SUCCESS: '退款成功',
  FAILED: '退款失败',
};

export const EnrollmentStatusLabel: Record<EnrollmentStatus, string> = {
  DEPOSIT_PENDING: '待付定金',
  DEPOSIT_PAID: '待付尾款',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
};

export const LeadStatusLabel: Record<LeadStatus, string> = {
  NEW: '新线索',
  CONTACTED: '已联系',
  CONVERTED: '已转化',
  INVALID: '无效',
};

export const AdminRoleLabel: Record<AdminRole, string> = {
  SUPER_ADMIN: '超级管理员',
  OPERATOR: '运营',
  REVIEWER: '审核员',
  FINANCE: '财务',
};
