import { OrderStatus } from '@luoji/shared';
import { nextOrderStatus } from './order.state';

describe('order state machine', () => {
  it('待支付可支付 / 关闭 / 取消', () => {
    expect(nextOrderStatus(OrderStatus.CREATED, 'PAY')).toBe(OrderStatus.PAID);
    expect(nextOrderStatus(OrderStatus.CREATED, 'CLOSE')).toBe(OrderStatus.CLOSED);
    expect(nextOrderStatus(OrderStatus.CREATED, 'CANCEL')).toBe(OrderStatus.CANCELLED);
  });

  it('已关闭的订单不能再支付（回调晚到需走退款）', () => {
    expect(nextOrderStatus(OrderStatus.CLOSED, 'PAY')).toBeNull();
  });

  it('重复支付回调不会再次流转', () => {
    expect(nextOrderStatus(OrderStatus.PAID, 'PAY')).toBeNull();
  });

  it('退款流程', () => {
    expect(nextOrderStatus(OrderStatus.PAID, 'REFUND')).toBe(OrderStatus.REFUNDING);
    expect(nextOrderStatus(OrderStatus.REFUNDING, 'REFUND_SUCCESS')).toBe(OrderStatus.REFUNDED);
    expect(nextOrderStatus(OrderStatus.REFUNDING, 'REFUND_FAIL')).toBe(OrderStatus.PAID);
    expect(nextOrderStatus(OrderStatus.CREATED, 'REFUND')).toBeNull();
  });
});
