import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCode, type IdentityType } from '@luoji/shared';
import type { Prisma } from '@prisma/client';
import { CryptoService } from '../../common/crypto/crypto.service';
import { BizException } from '../../common/exceptions/biz.exception';
import { isVisibleTo } from '../../common/visibility';
import { PrismaService } from '../../prisma/prisma.service';
import { genOrderNo } from '../order/order-no';
import { ORDER_TTL_MS, OrderService } from '../order/order.service';
import { ACTIVE_STATUSES, balanceProblem, enrollProblem, remainingSeats } from './enrollment.rules';

const activeWhere = { status: { in: [...ACTIVE_STATUSES] } } satisfies Prisma.EnrollmentWhereInput;

@Injectable()
export class OfflineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly orders: OrderService,
  ) {}

  /** 课程详情页：未开始的场次、剩余名额、我的报名状态 */
  async sessions(userId: string, identity: IdentityType, productId: string) {
    const product = await this.loadProduct(productId, identity);
    const now = new Date();
    const sessions = await this.prisma.offlineSession.findMany({
      where: { productId: product.id, enabled: true, startAt: { gt: now } },
      orderBy: { startAt: 'asc' },
      include: {
        _count: { select: { enrollments: { where: activeWhere } } },
        enrollments: { where: { userId, ...activeWhere }, select: { id: true, status: true } },
      },
    });
    return sessions.map(({ _count, enrollments, ...s }) => ({
      id: s.id,
      title: s.title,
      startAt: s.startAt,
      endAt: s.endAt,
      address: s.address,
      depositCent: s.depositCent,
      balanceCent: s.balanceCent,
      balanceDueAt: s.balanceDueAt,
      quota: s.quota,
      remaining: remainingSeats(s.quota, _count.enrollments),
      closed: now >= s.balanceDueAt,
      myEnrollment: enrollments[0] ?? null,
    }));
  }

  /**
   * 报名并创建定金订单。对场次行加锁（SELECT ... FOR UPDATE），
   * 并发报名时逐个判断名额，不会超卖；同一用户同一场次只能有一个有效报名。
   */
  async enroll(userId: string, identity: IdentityType, sessionId: string, contact: { name: string; phone: string }) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM offline_sessions WHERE id = ${sessionId} FOR UPDATE`;
      const session = await tx.offlineSession.findUnique({ where: { id: sessionId }, include: { product: true } });
      if (!session) throw new NotFoundException('场次不存在');
      await this.loadProduct(session.productId, identity);

      const [taken, mine] = await Promise.all([
        tx.enrollment.count({ where: { sessionId, ...activeWhere } }),
        tx.enrollment.count({ where: { sessionId, userId, ...activeWhere } }),
      ]);
      const problem = enrollProblem(session, taken, mine > 0);
      if (problem) throw new BizException(ErrorCode.BAD_REQUEST, problem, HttpStatus.CONFLICT);

      const order = await tx.order.create({
        data: {
          orderNo: genOrderNo(),
          userId,
          purpose: 'OFFLINE_DEPOSIT',
          totalCent: session.depositCent,
          payCent: session.depositCent,
          expireAt: new Date(Date.now() + ORDER_TTL_MS),
          items: {
            create: { productId: session.productId, title: `${session.product.title}（${session.title}）定金`, priceCent: session.depositCent },
          },
        },
      });
      const enrollment = await tx.enrollment.create({
        data: {
          userId,
          sessionId,
          contactName: contact.name,
          contactPhoneEnc: this.crypto.encrypt(contact.phone),
          contactPhoneMasked: CryptoService.maskPhone(contact.phone),
          depositOrderId: order.id,
        },
      });
      return { enrollmentId: enrollment.id, orderNo: order.orderNo, payCent: order.payCent };
    });
  }

  /** 发起尾款支付：已有未过期的尾款单则复用，否则新建 */
  async payBalance(userId: string, enrollmentId: string) {
    return this.prisma.$transaction(async (tx) => {
      const e = await tx.enrollment.findUnique({
        where: { id: enrollmentId },
        include: { session: { include: { product: { select: { title: true } } } }, balanceOrder: true },
      });
      if (!e || e.userId !== userId) throw new NotFoundException('报名记录不存在');
      const problem = balanceProblem(e.status, e.session);
      if (problem) throw new BizException(ErrorCode.BAD_REQUEST, problem);

      if (e.balanceOrder?.status === 'CREATED' && e.balanceOrder.expireAt > new Date()) {
        return { orderNo: e.balanceOrder.orderNo, payCent: e.balanceOrder.payCent };
      }
      const order = await tx.order.create({
        data: {
          orderNo: genOrderNo(),
          userId,
          purpose: 'OFFLINE_BALANCE',
          totalCent: e.session.balanceCent,
          payCent: e.session.balanceCent,
          // 尾款单不晚于尾款截止时间关闭
          expireAt: new Date(Math.min(Date.now() + ORDER_TTL_MS, e.session.balanceDueAt.getTime())),
          items: {
            create: { productId: e.session.productId, title: `${e.session.product.title}（${e.session.title}）尾款`, priceCent: e.session.balanceCent },
          },
        },
      });
      // 条件更新防止并发生成两张尾款单
      const { count } = await tx.enrollment.updateMany({
        where: { id: e.id, status: 'DEPOSIT_PAID', balanceOrderId: e.balanceOrderId },
        data: { balanceOrderId: order.id },
      });
      if (count !== 1) throw new BizException(ErrorCode.ORDER_STATE_INVALID, '请勿重复提交', HttpStatus.CONFLICT);
      return { orderNo: order.orderNo, payCent: order.payCent };
    });
  }

  /** 取消未付定金的报名（释放名额）；已付定金需联系工作人员退款 */
  async cancel(userId: string, enrollmentId: string) {
    const e = await this.prisma.enrollment.findUnique({ where: { id: enrollmentId }, include: { depositOrder: { select: { orderNo: true } } } });
    if (!e || e.userId !== userId) throw new NotFoundException('报名记录不存在');
    if (e.status !== 'DEPOSIT_PENDING') throw new BizException(ErrorCode.BAD_REQUEST, '已支付定金的报名请联系工作人员办理');
    if (e.depositOrder) await this.orders.cancel(userId, e.depositOrder.orderNo);
    return true;
  }

  /** 我的报名 */
  async mine(userId: string) {
    const rows = await this.prisma.enrollment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        session: { include: { product: { select: { id: true, title: true, cover: true } } } },
        depositOrder: { select: { orderNo: true, status: true, expireAt: true } },
        balanceOrder: { select: { orderNo: true, status: true, expireAt: true } },
      },
    });
    return rows.map((e) => ({
      id: e.id,
      status: e.status,
      contactName: e.contactName,
      contactPhoneMasked: e.contactPhoneMasked,
      cancelReason: e.cancelReason,
      createdAt: e.createdAt,
      product: e.session.product,
      session: {
        id: e.session.id,
        title: e.session.title,
        startAt: e.session.startAt,
        endAt: e.session.endAt,
        address: e.session.address,
        depositCent: e.session.depositCent,
        balanceCent: e.session.balanceCent,
        balanceDueAt: e.session.balanceDueAt,
      },
      depositOrder: e.depositOrder,
      balanceOrder: e.balanceOrder,
    }));
  }

  private async loadProduct(productId: string, identity: IdentityType) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, status: 'ONLINE', type: 'OFFLINE' } });
    if (!product) throw new NotFoundException('线下课不存在或已下架');
    if (!isVisibleTo(product.visibleTo, identity)) throw new BizException(ErrorCode.CONTENT_NOT_VISIBLE, '该内容对当前身份不可见');
    return product;
  }
}
