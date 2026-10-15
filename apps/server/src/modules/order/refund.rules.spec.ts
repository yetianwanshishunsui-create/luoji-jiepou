import { refundableCent, refundProblem, statusAfterRefund } from './refund.rules';

describe('refund rules', () => {
  const paid = { status: 'PAID', payCent: 19900, refundedCent: 0 };

  it('可退金额 = 实付 - 已退', () => {
    expect(refundableCent(19900, 0)).toBe(19900);
    expect(refundableCent(19900, 5000)).toBe(14900);
    expect(refundableCent(19900, 19900)).toBe(0);
  });

  it('全额与部分退款都允许', () => {
    expect(refundProblem({ ...paid, amountCent: 19900 })).toBeNull();
    expect(refundProblem({ ...paid, amountCent: 100 })).toBeNull();
  });

  it('超过可退金额拒绝', () => {
    expect(refundProblem({ ...paid, refundedCent: 15000, amountCent: 5000 })).toBe('退款金额不能超过可退金额 ¥49.00');
  });

  it('金额必须为正整数（分）', () => {
    expect(refundProblem({ ...paid, amountCent: 0 })).toBe('退款金额必须大于 0');
    expect(refundProblem({ ...paid, amountCent: 1.5 })).toBe('退款金额必须大于 0');
  });

  it('非已支付状态拒绝，处理中的退款给出明确提示', () => {
    expect(refundProblem({ ...paid, status: 'CREATED', amountCent: 100 })).toBe('只有已支付的订单可以退款');
    expect(refundProblem({ ...paid, status: 'REFUNDED', amountCent: 100 })).toBe('只有已支付的订单可以退款');
    expect(refundProblem({ ...paid, status: 'REFUNDING', amountCent: 100 })).toBe('该订单有退款正在处理中');
  });

  it('退完为 REFUNDED，部分退款仍为 PAID', () => {
    expect(statusAfterRefund(19900, 19900)).toBe('REFUNDED');
    expect(statusAfterRefund(19900, 10000)).toBe('PAID');
  });
});
