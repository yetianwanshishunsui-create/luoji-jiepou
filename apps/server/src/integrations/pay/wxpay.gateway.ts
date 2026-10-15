import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@luoji/shared';
import { BizException } from '../../common/exceptions/biz.exception';
import type { MiniProgramPayParams, PayGateway, RefundResult } from './pay-gateway';

const unavailable = () =>
  new BizException(ErrorCode.PAY_UNAVAILABLE, '微信支付待商户号开通后接入（WP06）', HttpStatus.SERVICE_UNAVAILABLE);

/**
 * 微信支付 API V3。
 * TODO(WP06)：商户号开通并与 AppID 绑定后实现：
 * - prepay：POST /v3/pay/transactions/jsapi → prepay_id，按 RSA-SHA256 生成 paySign
 * - closeOrder：POST /v3/pay/transactions/out-trade-no/{no}/close
 * - refund：POST /v3/refund/domestic/refunds（notify_url 指向退款回调）
 * - queryRefund：GET /v3/refund/domestic/refunds/{out_refund_no}
 */
export class WxPayGateway implements PayGateway {
  readonly mock = false;

  async prepay(): Promise<MiniProgramPayParams> {
    throw unavailable();
  }

  async closeOrder(): Promise<void> {
    // 未接入前本地关单即可：未拿到 prepay_id 的订单在微信侧不存在
  }

  async refund(): Promise<RefundResult> {
    throw unavailable();
  }

  async queryRefund(): Promise<RefundResult> {
    throw unavailable();
  }
}
