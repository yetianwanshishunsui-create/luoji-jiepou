import { HttpStatus, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ErrorCode, OrderStatus, PricingMode, type IdentityType } from '@luoji/shared';
import type { Prisma } from '@prisma/client';
import { BizException } from '../../common/exceptions/biz.exception';
import { isVisibleTo } from '../../common/visibility';
import { PAY_GATEWAY, type MiniProgramPayParams, type PayGateway } from '../../integrations/pay/pay-gateway';
import { PrismaService } from '../../prisma/prisma.service';
import { genOrderNo } from './order-no';
import { allowedFrom } from './order.state';
import { activeRule, evaluateCoupons, type ProductRef } from '../marketing/marketing.rules';
import { onOrderPaid, onOrderUnpaidClosed } from '../offline/enrollment.hooks';
import { effectivePrice } from './pricing';

/** 待支付订单有效期 */
export const ORDER_TTL_MS = 30 * 60 * 1000;

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAY_GATEWAY) private readonly gateway: PayGateway,
  ) {}

  /** 校验商品可购买（上架、身份可见、非线下课、付费、未拥有） */
  private async loadPurchasable(userId: string, identity: IdentityType, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, status: 'ONLINE' },
      include: { priceRules: { where: { enabled: true } }, category: { select: { parentId: true } } },
    });
    if (!product) throw new NotFoundException('课程不存在或已下架');
    if (!isVisibleTo(product.visibleTo, identity)) {
      throw new BizException(ErrorCode.CONTENT_NOT_VISIBLE, '该内容对当前身份不可见');
    }
    if (product.type === 'OFFLINE') {
      throw new BizException(ErrorCode.BAD_REQUEST, '线下课请通过报名入口下单');
    }
    if (product.pricingMode === PricingMode.FREE) {
      throw new BizException(ErrorCode.BAD_REQUEST, '免费课程无需购买');
    }
    const owned = await this.prisma.entitlement.findUnique({ where: { userId_productId: { userId, productId } } });
    if (owned) throw new BizException(ErrorCode.ORDER_STATE_INVALID, '已购买该课程');
    return product;
  }

  private static productRef(product: { id: string; categoryId: string | null; category: { parentId: string | null } | null }): ProductRef {
    return { id: product.id, categoryIds: [product.categoryId, product.category?.parentId].filter((c): c is string => !!c) };
  }

  /**
   * 结算预览：当前价（含早鸟 / 限时价）、可用与不可用的优惠券、推荐的最优券。
   * 下单时会按同样规则重新计算，以服务端为准。
   */
  async preview(userId: string, identity: IdentityType, productId: string) {
    const now = new Date();
    const product = await this.loadPurchasable(userId, identity, productId);
    const totalCent = effectivePrice(product.priceCent, product.priceRules, now);
    const rule = activeRule(product.priceCent, product.priceRules, now);

    const held = await this.prisma.userCoupon.findMany({
      where: { userId, status: 'UNUSED', coupon: { validTo: { gt: now } } },
      include: { coupon: true },
      orderBy: { claimedAt: 'desc' },
    });
    const options = evaluateCoupons(totalCent, OrderService.productRef(product), held, now);

    return {
      productId: product.id,
      title: product.title,
      cover: product.cover,
      originCent: product.priceCent,
      totalCent,
      priceRule: rule && { type: rule.type, priceCent: rule.priceCent, endAt: rule.endAt },
      bestUserCouponId: options.find((o) => !o.reason)?.item.id ?? null,
      coupons: options.map(({ item, discountCent, reason }) => ({
        userCouponId: item.id,
        name: item.coupon.name,
        description: item.coupon.description,
        type: item.coupon.type,
        thresholdCent: item.coupon.thresholdCent,
        faceCent: item.coupon.discountCent,
        validTo: item.coupon.validTo,
        discountCent,
        reason,
      })),
    };
  }

  /** 在线课程下单。线下课走报名流程（定金 + 尾款），见 TODO(WP06)。 */
  async create(userId: string, identity: IdentityType, productId: string, userCouponId?: string) {
    const now = new Date();
    const product = await this.loadPurchasable(userId, identity, productId);

    const totalCent = effectivePrice(product.priceCent, product.priceRules, now);

    return this.prisma.$transaction(async (tx) => {
      let discountCent = 0;
      if (userCouponId) {
        discountCent = await this.lockCoupon(tx, userId, userCouponId, OrderService.productRef(product), totalCent, now);
      }

      const order = await tx.order.create({
        data: {
          orderNo: genOrderNo(),
          userId,
          totalCent,
          discountCent,
          payCent: totalCent - discountCent,
          userCouponId: userCouponId ?? null,
          expireAt: new Date(now.getTime() + ORDER_TTL_MS),
          items: { create: { productId, title: product.title, priceCent: totalCent } },
        },
        select: { id: true, orderNo: true, totalCent: true, discountCent: true, payCent: true, expireAt: true, status: true },
      });
      if (userCouponId) {
        await tx.userCoupon.update({ where: { id: userCouponId }, data: { usedOrderId: order.id } });
      }
      // 到期未支付由 OrderScheduler 每分钟扫描关单
      return order;
    });
  }

  private async lockCoupon(
    tx: Prisma.TransactionClient,
    userId: string,
    userCouponId: string,
    product: ProductRef,
    totalCent: number,
    now: Date,
  ) {
    const uc = await tx.userCoupon.findFirst({ where: { id: userCouponId, userId, status: 'UNUSED' }, include: { coupon: true } });
    if (!uc) throw new BizException(ErrorCode.BAD_REQUEST, '优惠券不可用');

    const [option] = evaluateCoupons(totalCent, product, [uc], now);
    if (option.reason) throw new BizException(ErrorCode.BAD_REQUEST, `优惠券不可用：${option.reason}`);
    const discount = option.discountCent;

    // 条件更新锁券，防止同一张券被并发用于两笔订单
    const { count } = await tx.userCoupon.updateMany({ where: { id: userCouponId, status: 'UNUSED' }, data: { status: 'LOCKED' } });
    if (count !== 1) throw new BizException(ErrorCode.BAD_REQUEST, '优惠券已被使用');
    return discount;
  }

  /**
   * 获取小程序支付参数。模拟网关（开发环境）下直接视为支付成功。
   */
  async pay(userId: string, orderNo: string): Promise<MiniProgramPayParams | { mock: true }> {
    const order = await this.prisma.order.findUnique({
      where: { orderNo },
      include: { user: { select: { openid: true } }, items: { select: { title: true } } },
    });
    if (!order || order.userId !== userId) throw new NotFoundException('订单不存在');
    if (order.status !== OrderStatus.CREATED) throw new BizException(ErrorCode.ORDER_STATE_INVALID, '订单不是待支付状态', HttpStatus.CONFLICT);
    if (order.expireAt <= new Date()) {
      await this.close(orderNo).catch(() => undefined);
      throw new BizException(ErrorCode.ORDER_STATE_INVALID, '订单已超时关闭，请重新下单', HttpStatus.CONFLICT);
    }

    if (this.gateway.mock) {
      await this.markPaid(orderNo, `MOCK${orderNo}`, order.payCent);
      return { mock: true };
    }
    return this.gateway.prepay({
      orderNo,
      description: order.items.map((i) => i.title).join('、').slice(0, 120),
      amountCent: order.payCent,
      openid: order.user.openid,
      expireAt: order.expireAt,
    });
  }

  async listMine(userId: string, page: number, pageSize: number) {
    const where = { userId };
    const [list, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { items: { select: { productId: true, title: true, priceCent: true } } },
      }),
      this.prisma.order.count({ where }),
    ]);
    return { list, total, page, pageSize };
  }

  async cancel(userId: string, orderNo: string) {
    return this.finishUnpaid(orderNo, OrderStatus.CANCELLED, userId);
  }

  /** 超时关单（由 OrderScheduler 调用），同时关闭支付侧订单，防止关单后仍被支付 */
  async close(orderNo: string) {
    await this.gateway.closeOrder(orderNo);
    return this.finishUnpaid(orderNo, OrderStatus.CLOSED);
  }

  private async finishUnpaid(orderNo: string, to: 'CANCELLED' | 'CLOSED', userId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { orderNo } });
      if (!order || (userId && order.userId !== userId)) throw new NotFoundException('订单不存在');

      const { count } = await tx.order.updateMany({
        where: { id: order.id, status: { in: allowedFrom(to === 'CLOSED' ? 'CLOSE' : 'CANCEL') } },
        data: { status: to, closedAt: new Date() },
      });
      if (count !== 1) throw new BizException(ErrorCode.ORDER_STATE_INVALID, '订单状态已变化', HttpStatus.CONFLICT);

      if (order.userCouponId) {
        await tx.userCoupon.updateMany({
          where: { id: order.userCouponId, status: 'LOCKED' },
          data: { status: 'UNUSED', usedOrderId: null },
        });
      }
      await onOrderUnpaidClosed(tx, order);
      return { orderNo, status: to };
    });
  }

  /**
   * 支付成功处理（由微信支付回调 / 主动查单调用），幂等：
   * - 条件更新 CREATED → PAID，重复回调直接返回
   * - 同一事务内开通权益、核销优惠券
   */
  async markPaid(orderNo: string, wxTransactionId: string, paidCent: number) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { orderNo }, include: { items: true } });
      if (!order) throw new NotFoundException(`订单不存在：${orderNo}`);
      if (order.status === OrderStatus.PAID && order.wxTransactionId === wxTransactionId) return { duplicated: true };
      if (paidCent !== order.payCent) {
        this.logger.error(`支付金额不一致 orderNo=${orderNo} expect=${order.payCent} actual=${paidCent}`);
        throw new BizException(ErrorCode.ORDER_STATE_INVALID, '支付金额不一致');
      }

      const { count } = await tx.order.updateMany({
        where: { id: order.id, status: { in: allowedFrom('PAY') } },
        data: { status: OrderStatus.PAID, wxTransactionId, paidAt: new Date() },
      });
      if (count !== 1) {
        // 已关闭 / 已取消后才收到支付：需人工或自动退款
        // TODO(WP06)：自动发起退款并告警
        this.logger.error(`订单非待支付状态却收到支付 orderNo=${orderNo} status=${order.status}`);
        throw new BizException(ErrorCode.ORDER_STATE_INVALID, '订单状态异常', HttpStatus.CONFLICT);
      }

      // 线下课定金 / 尾款不开通线上学习权益，改为推进报名状态
      await onOrderPaid(tx, order);
      for (const item of order.purpose === 'PRODUCT' ? order.items : []) {
        await tx.entitlement.upsert({
          where: { userId_productId: { userId: order.userId, productId: item.productId } },
          create: { userId: order.userId, productId: item.productId, source: 'ORDER', orderId: order.id },
          update: { source: 'ORDER', orderId: order.id, expireAt: null },
        });
      }
      if (order.userCouponId) {
        await tx.userCoupon.update({ where: { id: order.userCouponId }, data: { status: 'USED', usedAt: new Date() } });
      }
      // TODO(二期)：发布 order.paid 事件，供分销 / 积分等订阅
      return { duplicated: false };
    });
  }
}
