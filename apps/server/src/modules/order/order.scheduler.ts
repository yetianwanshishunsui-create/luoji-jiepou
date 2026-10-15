import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type Redis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
import { REDIS } from '../../redis/redis.module';
import { OrderService } from './order.service';
import { RefundService } from './refund.service';

const BATCH = 200;

/**
 * 订单定时任务。多实例部署时用 Redis 锁保证同一时刻只有一个实例执行。
 * - 每分钟：关闭超时未支付的订单（释放锁定的优惠券）
 * - 每 5 分钟：查询处理中超过 1 分钟的退款（兜底退款回调丢失）
 */
@Injectable()
export class OrderScheduler {
  private readonly logger = new Logger(OrderScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrderService,
    private readonly refunds: RefundService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  private async withLock(key: string, ttlSec: number, fn: () => Promise<void>) {
    const ok = await this.redis.set(`lock:${key}`, '1', 'EX', ttlSec, 'NX');
    if (!ok) return;
    try {
      await fn();
    } finally {
      await this.redis.del(`lock:${key}`);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  closeExpired() {
    return this.withLock('order-close', 55, async () => {
      const expired = await this.prisma.order.findMany({
        where: { status: 'CREATED', expireAt: { lt: new Date() } },
        select: { orderNo: true },
        take: BATCH,
      });
      for (const { orderNo } of expired) {
        await this.orders.close(orderNo).catch((e) => this.logger.warn(`关单失败 ${orderNo}：${(e as Error).message}`));
      }
      if (expired.length) this.logger.log(`关闭超时订单 ${expired.length} 笔`);
    });
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  syncProcessingRefunds() {
    return this.withLock('refund-sync', 280, async () => {
      const pending = await this.prisma.refund.findMany({
        where: { status: 'PROCESSING', createdAt: { lt: new Date(Date.now() - 60_000) } },
        select: { refundNo: true },
        take: BATCH,
      });
      for (const { refundNo } of pending) {
        await this.refunds.sync(refundNo).catch((e) => this.logger.warn(`退款查询失败 ${refundNo}：${(e as Error).message}`));
      }
    });
  }
}
