/**
 * 支付网关抽象：业务代码只依赖这个接口。
 * - WxPayGateway：微信支付 API V3（商户号开通后实现，WP06）
 * - MockPayGateway：本地开发联调用，支付 / 退款立即成功
 */
export const PAY_GATEWAY = Symbol('PAY_GATEWAY');

/** wx.requestPayment 所需参数 */
export interface MiniProgramPayParams {
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: 'RSA';
  paySign: string;
}

export interface PrepayInput {
  orderNo: string;
  description: string;
  amountCent: number;
  openid: string;
  expireAt: Date;
}

export interface RefundInput {
  orderNo: string;
  refundNo: string;
  /** 原订单实付金额 */
  totalCent: number;
  amountCent: number;
  reason: string;
}

export interface RefundResult {
  status: 'SUCCESS' | 'PROCESSING' | 'FAILED';
  wxRefundId?: string;
  failReason?: string;
}

export interface PayGateway {
  /** 模拟网关：下单后直接视为支付成功 */
  readonly mock: boolean;
  prepay(input: PrepayInput): Promise<MiniProgramPayParams>;
  closeOrder(orderNo: string): Promise<void>;
  refund(input: RefundInput): Promise<RefundResult>;
  queryRefund(refundNo: string): Promise<RefundResult>;
}
