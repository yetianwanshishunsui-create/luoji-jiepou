import { Body, Controller, Get, NotFoundException, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { AdminRole, OrderPurpose, OrderStatus, OrderStatusLabel } from '@luoji/shared';
import type { Prisma } from '@prisma/client';
import type { Response } from 'express';
import { CurrentAdmin, type AdminTokenPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SkipTransform } from '../../common/decorators/skip-transform.decorator';
import { CryptoService } from '../../common/crypto/crypto.service';
import { PageQueryDto } from '../../common/dto/page.dto';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { RefundService } from '../order/refund.service';
import { AuditService } from './audit.service';

class OrderQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(Object.values(OrderStatus))
  status?: OrderStatus;

  @IsOptional()
  @IsIn(Object.values(OrderPurpose))
  purpose?: OrderPurpose;

  /** 订单号 / 用户手机号（完整 11 位）/ 课程标题 */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  keyword?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

class RefundDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000_000)
  amountCent: number;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: '请填写退款原因' })
  @MaxLength(80)
  reason: string;

  @IsBoolean()
  revokeEntitlement: boolean;
}

const EXPORT_LIMIT = 10_000;

@ApiTags('后台 · 订单')
@ApiBearerAuth()
@Roles(AdminRole.FINANCE, AdminRole.OPERATOR)
@UseGuards(AdminAuthGuard)
@Controller('admin/v1')
export class AdminOrderController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly refunds: RefundService,
    private readonly audit: AuditService,
  ) {}

  private where(q: OrderQueryDto): Prisma.OrderWhereInput {
    const kw = q.keyword?.trim();
    return {
      ...(q.status && { status: q.status }),
      ...(q.purpose && { purpose: q.purpose }),
      ...((q.from || q.to) && {
        createdAt: { ...(q.from && { gte: new Date(q.from) }), ...(q.to && { lte: new Date(q.to) }) },
      }),
      ...(kw && {
        OR: [
          { orderNo: { startsWith: kw } },
          { items: { some: { title: { contains: kw } } } },
          ...(/^1\d{10}$/.test(kw) ? [{ user: { phoneHash: this.crypto.hash(kw) } }] : []),
        ],
      }),
    };
  }

  @Get('orders')
  async list(@Query() q: OrderQueryDto) {
    const where = this.where(q);
    const paidWhere: Prisma.OrderWhereInput = { AND: [where, { paidAt: { not: null } }] };
    const [list, total, paid] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: q.skip,
        take: q.pageSize,
        include: {
          user: { select: { id: true, nickname: true, phoneMasked: true } },
          items: { select: { productId: true, title: true, priceCent: true } },
        },
      }),
      this.prisma.order.count({ where }),
      this.prisma.order.aggregate({ where: paidWhere, _sum: { payCent: true, refundedCent: true }, _count: true }),
    ]);
    return {
      list,
      total,
      page: q.page,
      pageSize: q.pageSize,
      summary: {
        paidCount: paid._count,
        paidCent: paid._sum.payCent ?? 0,
        refundedCent: paid._sum.refundedCent ?? 0,
      },
    };
  }

  /** 导出 CSV（UTF-8 BOM，Excel 可直接打开） */
  @Get('orders/export')
  @Roles(AdminRole.FINANCE)
  @SkipTransform()
  async export(@Query() q: OrderQueryDto, @Res() res: Response, @CurrentAdmin() admin: AdminTokenPayload) {
    const rows = await this.prisma.order.findMany({
      where: this.where(q),
      orderBy: { createdAt: 'desc' },
      take: EXPORT_LIMIT,
      include: { user: { select: { nickname: true, phoneMasked: true } }, items: { select: { title: true } } },
    });
    await this.audit.log(admin.sub, 'ORDER_EXPORT', undefined, { ...q, rows: rows.length });

    const yuan = (c: number) => (c / 100).toFixed(2);
    const time = (d: Date | null) => (d ? d.toISOString().replace('T', ' ').slice(0, 19) : '');
    // 以 = + - @ 开头的单元格前加 '，防止 CSV 公式注入
    const cell = (v: string) => {
      const safe = /^[=+\-@]/.test(v) ? `'${v}` : v;
      return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
    };
    const header = ['订单号', '状态', '商品', '用户', '手机号', '订单金额', '优惠', '实付', '已退款', '下单时间(UTC)', '支付时间(UTC)', '微信支付单号'];
    const lines = rows.map((o) =>
      [
        o.orderNo,
        OrderStatusLabel[o.status],
        o.items.map((i) => i.title).join('；'),
        o.user.nickname ?? '',
        o.user.phoneMasked ?? '',
        yuan(o.totalCent),
        yuan(o.discountCent),
        yuan(o.payCent),
        yuan(o.refundedCent),
        time(o.createdAt),
        time(o.paidAt),
        o.wxTransactionId ?? '',
      ]
        .map((v) => cell(String(v)))
        .join(','),
    );

    const filename = encodeURIComponent(`订单_${new Date().toISOString().slice(0, 10)}.csv`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
    res.send('﻿' + [header.join(','), ...lines].join('\r\n'));
  }

  @Get('orders/:orderNo')
  async detail(@Param('orderNo') orderNo: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNo },
      include: {
        user: { select: { id: true, nickname: true, phoneMasked: true, identityType: true } },
        items: { include: { product: { select: { id: true, type: true } } } },
        refunds: { orderBy: { createdAt: 'desc' } },
        entitlements: { select: { productId: true, createdAt: true } },
      },
    });
    if (!order) throw new NotFoundException('订单不存在');

    const [coupon, operators] = await Promise.all([
      order.userCouponId
        ? this.prisma.userCoupon.findUnique({ where: { id: order.userCouponId }, select: { status: true, coupon: { select: { name: true } } } })
        : null,
      this.prisma.adminUser.findMany({
        where: { id: { in: order.refunds.map((r) => r.operatorId).filter((id): id is string => !!id) } },
        select: { id: true, name: true },
      }),
    ]);
    const nameOf = new Map(operators.map((a) => [a.id, a.name]));

    return {
      ...order,
      coupon: coupon && { name: coupon.coupon.name, status: coupon.status },
      refunds: order.refunds.map((r) => ({ ...r, operatorName: r.operatorId ? (nameOf.get(r.operatorId) ?? null) : null })),
    };
  }

  @Post('orders/:orderNo/refunds')
  @Roles(AdminRole.FINANCE)
  refund(@Param('orderNo') orderNo: string, @Body() dto: RefundDto, @CurrentAdmin() admin: AdminTokenPayload) {
    return this.refunds.apply(orderNo, admin.sub, dto);
  }

  @Post('refunds/:refundNo/sync')
  @Roles(AdminRole.FINANCE)
  sync(@Param('refundNo') refundNo: string) {
    return this.refunds.sync(refundNo);
  }
}
