import { HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCode } from '@luoji/shared';
import type { Prisma } from '@prisma/client';
import type Redis from 'ioredis';
import { BizException } from '../../common/exceptions/biz.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { REDIS } from '../../redis/redis.module';
import { claimProblem } from './marketing.rules';

export type MyCouponTab = 'usable' | 'used' | 'expired';

@Injectable()
export class CouponService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  /**
   * 发放额度 +1：总量为 0 表示不限，否则在 issued_count < total_count 时才成功。
   * 列与列比较 Prisma 无法表达，用原生 SQL 保证并发下不超发。
   */
  static async takeQuota(tx: Prisma.TransactionClient | PrismaService, couponId: string, n = 1): Promise<boolean> {
    const affected = await tx.$executeRaw`
      UPDATE coupons SET issued_count = issued_count + ${n}
      WHERE id = ${couponId} AND (total_count = 0 OR issued_count + ${n} <= total_count)`;
    return affected === 1;
  }

  /** 领券中心：可领取的券 + 当前用户已领张数 */
  async center(userId: string) {
    const now = new Date();
    const coupons = await this.prisma.coupon.findMany({
      where: { enabled: true, claimable: true, validTo: { gt: now } },
      orderBy: [{ discountCent: 'desc' }, { createdAt: 'desc' }],
    });
    const held = await this.prisma.userCoupon.groupBy({
      by: ['couponId'],
      where: { userId, couponId: { in: coupons.map((c) => c.id) } },
      _count: true,
    });
    const heldBy = new Map(held.map((h) => [h.couponId, h._count]));

    return coupons
      .map((c) => {
        const heldCount = heldBy.get(c.id) ?? 0;
        const problem = claimProblem(c, heldCount, now);
        return {
          id: c.id,
          name: c.name,
          description: c.description,
          type: c.type,
          thresholdCent: c.thresholdCent,
          discountCent: c.discountCent,
          scope: c.scope,
          validFrom: c.validFrom,
          validTo: c.validTo,
          heldCount,
          soldOut: c.totalCount > 0 && c.issuedCount >= c.totalCount,
          claimable: !problem,
          reason: problem,
        };
      })
      .filter((c) => !c.soldOut || c.heldCount > 0);
  }

  /** 领券：Redis 锁防止同一用户并发重复领取，SQL 条件更新防止超发 */
  async claim(userId: string, couponId: string) {
    const lockKey = `lock:claim:${couponId}:${userId}`;
    if (!(await this.redis.set(lockKey, '1', 'EX', 10, 'NX'))) {
      throw new BizException(ErrorCode.TOO_MANY_REQUESTS, '操作太快了，请稍后再试', HttpStatus.TOO_MANY_REQUESTS);
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        const coupon = await tx.coupon.findUnique({ where: { id: couponId } });
        if (!coupon) throw new NotFoundException('优惠券不存在');
        const heldCount = await tx.userCoupon.count({ where: { userId, couponId } });
        const problem = claimProblem(coupon, heldCount);
        if (problem) throw new BizException(ErrorCode.BAD_REQUEST, problem);
        if (!(await CouponService.takeQuota(tx, couponId))) throw new BizException(ErrorCode.BAD_REQUEST, '优惠券已被领完');
        return tx.userCoupon.create({ data: { userId, couponId }, select: { id: true, claimedAt: true } });
      });
    } finally {
      await this.redis.del(lockKey);
    }
  }

  /** 我的优惠券：可使用（含下单锁定中）/ 已使用 / 已过期 */
  async mine(userId: string, tab: MyCouponTab) {
    const now = new Date();
    const where: Prisma.UserCouponWhereInput =
      tab === 'used'
        ? { userId, status: 'USED' }
        : tab === 'expired'
          ? { userId, status: { in: ['UNUSED', 'EXPIRED'] }, coupon: { validTo: { lte: now } } }
          : { userId, status: { in: ['UNUSED', 'LOCKED'] }, coupon: { validTo: { gt: now } } };

    const rows = await this.prisma.userCoupon.findMany({
      where,
      include: { coupon: true },
      orderBy: tab === 'usable' ? { coupon: { validTo: 'asc' } } : { claimedAt: 'desc' },
      take: 200,
    });
    return rows.map((uc) => ({
      id: uc.id,
      status: uc.status,
      claimedAt: uc.claimedAt,
      usedAt: uc.usedAt,
      name: uc.coupon.name,
      description: uc.coupon.description,
      type: uc.coupon.type,
      thresholdCent: uc.coupon.thresholdCent,
      discountCent: uc.coupon.discountCent,
      scope: uc.coupon.scope,
      validFrom: uc.coupon.validFrom,
      validTo: uc.coupon.validTo,
    }));
  }
}
