import { api } from '@/api';

/**
 * 拉起支付：开发环境模拟网关直接成功；正式环境调用 wx.requestPayment。
 * 返回 true 表示支付成功，false 表示用户取消或支付失败（错误提示已由 request 处理）。
 */
export async function payOrder(orderNo: string): Promise<boolean> {
  try {
    const params = await api.payOrder(orderNo);
    if ('mock' in params) return true;
    await new Promise<void>((resolve, reject) =>
      uni.requestPayment({ provider: 'wxpay', ...params, success: () => resolve(), fail: reject } as UniApp.RequestPaymentOptions),
    );
    return true;
  } catch {
    return false;
  }
}
