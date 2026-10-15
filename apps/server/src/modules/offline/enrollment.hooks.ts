import type { Order, Prisma } from '@prisma/client';
import { statusAfterPaid } from './enrollment.rules';

/**
 * 订单生命周期对线下课报名的影响。在订单相关事务内调用，保证订单与报名状态一致。
 * 普通课程订单（purpose = PRODUCT）直接忽略。
 */
type Tx = Prisma.TransactionClient;
type OrderRef = Pick<Order, 'id' | 'purpose'>;

/** 支付成功：定金 → 待付尾款（无尾款直接完成）；尾款 → 完成 */
export async function onOrderPaid(tx: Tx, order: OrderRef) {
  if (order.purpose === 'OFFLINE_DEPOSIT') {
    const e = await tx.enrollment.findUnique({ where: { depositOrderId: order.id }, include: { session: { select: { balanceCent: true } } } });
    if (!e) return;
    await tx.enrollment.updateMany({
      where: { id: e.id, status: 'DEPOSIT_PENDING' },
      data: { status: statusAfterPaid('OFFLINE_DEPOSIT', e.session.balanceCent) },
    });
  } else if (order.purpose === 'OFFLINE_BALANCE') {
    await tx.enrollment.updateMany({ where: { balanceOrderId: order.id, status: 'DEPOSIT_PAID' }, data: { status: 'COMPLETED' } });
  }
}

/** 未支付订单取消 / 超时关闭：定金单 → 报名取消并释放名额；尾款单 → 解绑，可重新发起 */
export async function onOrderUnpaidClosed(tx: Tx, order: OrderRef) {
  if (order.purpose === 'OFFLINE_DEPOSIT') {
    await tx.enrollment.updateMany({
      where: { depositOrderId: order.id, status: 'DEPOSIT_PENDING' },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: '定金未支付' },
    });
  } else if (order.purpose === 'OFFLINE_BALANCE') {
    await tx.enrollment.updateMany({ where: { balanceOrderId: order.id }, data: { balanceOrderId: null } });
  }
}

/** 订单全额退款：定金退款 → 报名取消；尾款退款 → 回到待付尾款 */
export async function onOrderFullyRefunded(tx: Tx, order: OrderRef) {
  if (order.purpose === 'OFFLINE_DEPOSIT') {
    await tx.enrollment.updateMany({
      where: { depositOrderId: order.id, status: { in: ['DEPOSIT_PAID', 'COMPLETED'] } },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: '定金已退款' },
    });
  } else if (order.purpose === 'OFFLINE_BALANCE') {
    await tx.enrollment.updateMany({
      where: { balanceOrderId: order.id, status: 'COMPLETED' },
      data: { status: 'DEPOSIT_PAID', balanceOrderId: null },
    });
  }
}
