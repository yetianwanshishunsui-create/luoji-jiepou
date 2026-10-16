import { api } from '@/api';

/**
 * 拉起支付：开发环境模拟网关直接成功；正式环境调用 wx.requestPayment。
 * 返回 true 表示支付成功，false 表示用户取消或支付失败（错误提示已由 request 处理）。
 */
export async function payOrder(orderNo: string, payCent?: number): Promise<boolean> {
  if (import.meta.env.VITE_DEMO === 'true') {
    // 演示版：模拟微信支付确认框，不产生真实扣款
    const { confirm } = await new Promise<UniApp.ShowModalRes>((resolve) =>
      uni.showModal({
        title: '模拟微信支付',
        content: `${payCent != null ? `支付金额 ¥${(payCent / 100).toFixed(2)}\n` : ''}演示版不会产生真实扣款`,
        confirmText: '确认支付',
        cancelText: '取消',
        success: resolve,
        fail: () => resolve({ confirm: false, cancel: true } as UniApp.ShowModalRes),
      }),
    );
    if (!confirm) return false;
  }
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
