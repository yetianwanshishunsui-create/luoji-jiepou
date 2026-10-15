import { Logger } from '@nestjs/common';
import type { MiniProgramPayParams, PayGateway, PrepayInput, RefundInput, RefundResult } from './pay-gateway';

/** 开发环境模拟网关（PAY_MOCK=true）。生产环境开启会被启动校验拒绝。 */
export class MockPayGateway implements PayGateway {
  readonly mock = true;
  private readonly logger = new Logger('MockPay');

  async prepay(input: PrepayInput): Promise<MiniProgramPayParams> {
    this.logger.warn(`模拟下单 ${input.orderNo} ¥${input.amountCent / 100}`);
    return { timeStamp: String(Math.floor(Date.now() / 1000)), nonceStr: 'mock', package: `prepay_id=mock_${input.orderNo}`, signType: 'RSA', paySign: 'mock' };
  }

  async closeOrder(): Promise<void> {}

  async refund(input: RefundInput): Promise<RefundResult> {
    this.logger.warn(`模拟退款 ${input.refundNo} ¥${input.amountCent / 100}`);
    return { status: 'SUCCESS', wxRefundId: `mock_${input.refundNo}` };
  }

  async queryRefund(refundNo: string): Promise<RefundResult> {
    return { status: 'SUCCESS', wxRefundId: `mock_${refundNo}` };
  }
}
