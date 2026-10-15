import { HttpStatus, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ErrorCode } from '@luoji/shared';
import { BizException } from '../../common/exceptions/biz.exception';
import { PAY_GATEWAY, type PayGateway, type RefundResult } from '../../integrations/pay/pay-gateway';
import { PrismaService } from '../../prisma/prisma.service';
import { onOrderFullyRefunded } from '../offline/enrollment.hooks';
import { genOrderNo } from './order-no';
import { refundProblem, statusAfterRefund } from './refund.rules';

export interface RefundRequest {
  amountCent: number;
  reason: string;
  revokeEntitlement: boolean;
}

/**
 * 退款流程：
 * 1. 校验并在同一事务内把订单 PAID → REFUNDING、创建 PROCESSING 退款单（条件更新防并发）
 * 2. 调用支付网关发起退款
 * 3. 根据结果（同步返回 / 退款回调 / 定时查询）调用 applyResult 落终态
 * 优惠券不退回；是否收回学习权益由操作人决定（全额退款默认收回）。
 */
@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAY_GATEWAY) private readonly gateway: PayGateway,
  ) {}

  async apply(orderNo: string, operatorId: string, req: RefundRequest) {
    const refund = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { orderNo } });
      if (!order) throw new NotFoundException('订单不存在');

      const problem = refundProblem({ ...order, amountCent: req.amountCent });
      if (problem) throw new BizException(ErrorCode.ORDER_STATE_INVALID, problem, HttpStatus.CONFLICT);

      const { count } = await tx.order.updateMany({ where: { id: order.id, status: 'PAID' }, data: { status: 'REFUNDING' } });
      if (count !== 1) throw new BizException(ErrorCode.ORDER_STATE_INVALID, '订单状态已变化，请刷新后重试', HttpStatus.CONFLICT);

      const created = await tx.refund.create({
        data: {
          orderId: order.id,
          refundNo: genOrderNo('R'),
          amountCent: req.amountCent,
          reason: req.reason,
          revokeEntitlement: req.revokeEntitlement,
          operatorId,
        },
      });
      await tx.auditLog.create({
        data: { adminId: operatorId, action: 'ORDER_REFUND', target: orderNo, detail: { refundNo: created.refundNo, ...req } },
      });
      return { ...created, payCent: order.payCent };
    });

    let result: RefundResult;
    try {
      result = await this.gateway.refund({
        orderNo,
        refundNo: refund.refundNo,
        totalCent: refund.payCent,
        amountCent: refund.amountCent,
        reason: refund.reason ?? '',
      });
    } catch (e) {
      // 网关不可用 / 请求被拒：退款单记为失败，订单回到已支付，原样抛出错误给操作人
      await this.applyResult(refund.refundNo, { status: 'FAILED', failReason: (e as Error).message.slice(0, 255) });
      throw e;
    }
    await this.applyResult(refund.refundNo, result);
    return this.prisma.refund.findUniqueOrThrow({ where: { refundNo: refund.refundNo } });
  }

  /** 主动查询处理中的退款（后台“同步状态”按钮 / 定时任务） */
  async sync(refundNo: string) {
    const refund = await this.prisma.refund.findUnique({ where: { refundNo } });
    if (!refund) throw new NotFoundException('退款单不存在');
    if (refund.status === 'PROCESSING') await this.applyResult(refundNo, await this.gateway.queryRefund(refundNo));
    return this.prisma.refund.findUniqueOrThrow({ where: { refundNo } });
  }

  /**
   * 落退款终态，幂等：只处理仍为 PROCESSING 的退款单。
   * TODO(WP06)：微信退款回调验签解密后同样调用本方法。
   */
  async applyResult(refundNo: string, result: RefundResult) {
    if (result.status === 'PROCESSING') {
      if (result.wxRefundId) await this.prisma.refund.update({ where: { refundNo }, data: { wxRefundId: result.wxRefundId } });
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      const refund = await tx.refund.findUnique({ where: { refundNo }, include: { order: true } });
      if (!refund) throw new NotFoundException('退款单不存在');

      const { count } = await tx.refund.updateMany({
        where: { id: refund.id, status: 'PROCESSING' },
        data: {
          status: result.status,
          wxRefundId: result.wxRefundId,
          failReason: result.failReason,
          finishedAt: new Date(),
        },
      });
      if (count !== 1) return; // 已处理过（重复回调 / 并发查询）

      const order = refund.order;
      if (result.status === 'FAILED') {
        await tx.order.updateMany({ where: { id: order.id, status: 'REFUNDING' }, data: { status: 'PAID' } });
        this.logger.warn(`退款失败 ${refundNo}：${result.failReason}`);
        return;
      }

      const refundedCent = order.refundedCent + refund.amountCent;
      const nextStatus = statusAfterRefund(order.payCent, refundedCent);
      await tx.order.update({ where: { id: order.id }, data: { refundedCent, status: nextStatus } });
      if (nextStatus === 'REFUNDED') await onOrderFullyRefunded(tx, order);
      if (refund.revokeEntitlement) {
        await tx.entitlement.deleteMany({ where: { orderId: order.id } });
      }
    });
  }
}
