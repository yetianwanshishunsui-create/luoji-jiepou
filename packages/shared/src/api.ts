/** 统一响应结构，与后端 TransformInterceptor / AllExceptionsFilter 对应 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
  traceId?: string;
}

export interface PageQuery {
  page?: number;
  pageSize?: number;
}

export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** 业务错误码：0 成功；1xxxx 通用；2xxxx 认证；3xxxx 内容；4xxxx 交易 */
export const ErrorCode = {
  OK: 0,
  BAD_REQUEST: 10400,
  UNAUTHORIZED: 10401,
  FORBIDDEN: 10403,
  NOT_FOUND: 10404,
  TOO_MANY_REQUESTS: 10429,
  INTERNAL: 10500,
  NOT_IMPLEMENTED: 10501,
  CERT_REQUIRED: 20001,
  CERT_PENDING: 20002,
  CERT_STATE_INVALID: 20003,
  CONTENT_NOT_VISIBLE: 30001,
  CONTENT_NOT_PURCHASED: 30002,
  ORDER_STATE_INVALID: 40001,
  PAY_UNAVAILABLE: 40002,
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** 小程序登录返回 */
export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}

export interface UserProfile {
  id: string;
  nickname: string | null;
  avatar: string | null;
  identityType: import('./enums').IdentityType | null;
  certStatus: import('./enums').CertStatus;
  phoneMasked: string | null;
}
