import { Body, Controller, Get, NotFoundException, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminRole, ErrorCode } from '@luoji/shared';
import type { Prisma } from '@prisma/client';
import { CryptoService } from '../../../common/crypto/crypto.service';
import { CurrentAdmin, type AdminTokenPayload } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { BizException } from '../../../common/exceptions/biz.exception';
import { AdminAuthGuard } from '../../../common/guards/admin-auth.guard';
import { PrismaService } from '../../../prisma/prisma.service';
import { CouponService } from '../../marketing/coupon.service';
import { AuditService } from '../audit.service';
import { couponConfigProblem, lockedChangeProblem } from './coupon-check';
import { CouponDto, CouponEnabledDto, CouponQueryDto, CouponRecordQueryDto, IssueCouponDto } from './marketing.dto';

@ApiTags('后台 · 营销 · 优惠券')
@ApiBearerAuth()
@Roles(AdminRole.OPERATOR)
@UseGuards(AdminAuthGuard)
@Controller('admin/v1/marketing/coupons')
export class AdminCouponController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list(@Query() q: CouponQueryDto) {
    const now = new Date();
    const phase: Prisma.CouponWhereInput =
      q.phase === 'disabled'
        ? { enabled: false }
        : q.phase === 'active'
          ? { enabled: true, validFrom: { lte: now }, validTo: { gt: now } }
          : q.phase === 'upcoming'
            ? { enabled: true, validFrom: { gt: now } }
            : q.phase === 'ended'
              ? { enabled: true, validTo: { lte: now } }
              : {};
    const where: Prisma.CouponWhereInput = { ...phase, ...(q.keyword && { name: { contains: q.keyword } }) };
    const [rows, total] = await Promise.all([
      this.prisma.coupon.findMany({ where, orderBy: { createdAt: 'desc' }, skip: q.skip, take: q.pageSize }),
      this.prisma.coupon.count({ where }),
    ]);
    const used = await this.prisma.userCoupon.groupBy({
      by: ['couponId'],
      where: { couponId: { in: rows.map((r) => r.id) }, status: 'USED' },
      _count: true,
    });
    const usedBy = new Map(used.map((u) => [u.couponId, u._count]));
    return { list: rows.map((c) => ({ ...c, usedCount: usedBy.get(c.id) ?? 0 })), total, page: q.page, pageSize: q.pageSize };
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('优惠券不存在');
    const ids = (coupon.scopeIds as string[] | null) ?? [];
    // 回显适用范围的名称
    const scopeItems =
      coupon.scope === 'PRODUCT'
        ? await this.prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } })
        : coupon.scope === 'CATEGORY'
          ? (await this.prisma.category.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })).map((c) => ({ id: c.id, title: c.name }))
          : [];
    return { ...coupon, scopeItems };
  }

  @Post()
  async create(@Body() dto: CouponDto, @CurrentAdmin() admin: AdminTokenPayload) {
    const data = await this.toData(dto);
    const coupon = await this.prisma.coupon.create({ data });
    await this.audit.log(admin.sub, 'COUPON_CREATE', coupon.id, { name: coupon.name });
    return coupon;
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: CouponDto, @CurrentAdmin() admin: AdminTokenPayload) {
    const current = await this.prisma.coupon.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('优惠券不存在');
    const data = await this.toData(dto);
    const problem = lockedChangeProblem(
      { ...current, scopeIds: (current.scopeIds as string[] | null) ?? [] },
      { ...data, scopeIds: data.scopeIds },
    );
    if (problem) throw new BizException(ErrorCode.BAD_REQUEST, problem);
    const coupon = await this.prisma.coupon.update({ where: { id }, data });
    await this.audit.log(admin.sub, 'COUPON_UPDATE', id, { name: coupon.name });
    return coupon;
  }

  @Patch(':id/enabled')
  async setEnabled(@Param('id') id: string, @Body() dto: CouponEnabledDto, @CurrentAdmin() admin: AdminTokenPayload) {
    const exists = await this.prisma.coupon.count({ where: { id } });
    if (!exists) throw new NotFoundException('优惠券不存在');
    await this.prisma.coupon.update({ where: { id }, data: { enabled: dto.enabled } });
    await this.audit.log(admin.sub, dto.enabled ? 'COUPON_ENABLE' : 'COUPON_DISABLE', id);
    return { id, enabled: dto.enabled };
  }

  /**
   * 定向发放：每个对象一张，不受每人限领限制。对象为 11 位手机号或用户 ID。
   * 找不到的对象返回在 notFound 中；总量不足时停止发放。
   */
  @Post(':id/issue')
  async issue(@Param('id') id: string, @Body() dto: IssueCouponDto, @CurrentAdmin() admin: AdminTokenPayload) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('优惠券不存在');
    if (!coupon.enabled) throw new BizException(ErrorCode.BAD_REQUEST, '优惠券已停用');
    if (coupon.validTo <= new Date()) throw new BizException(ErrorCode.BAD_REQUEST, '优惠券已过期');

    const targets = [...new Set(dto.targets.map((t) => t.trim()).filter(Boolean))];
    const isPhone = (t: string) => /^1\d{10}$/.test(t);
    const phones = targets.filter(isPhone);
    const ids = targets.filter((t) => !isPhone(t));

    const [byPhone, byId] = await Promise.all([
      this.prisma.user.findMany({ where: { phoneHash: { in: phones.map((p) => this.crypto.hash(p)) } }, select: { id: true, phoneHash: true } }),
      this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true } }),
    ]);
    const foundHashes = new Set(byPhone.map((u) => u.phoneHash));
    const foundIds = new Set(byId.map((u) => u.id));
    const notFound = [...phones.filter((p) => !foundHashes.has(this.crypto.hash(p))), ...ids.filter((i) => !foundIds.has(i))];
    const users = [...new Set([...byPhone.map((u) => u.id), ...byId.map((u) => u.id)])];

    let issued = 0;
    let quotaExhausted = false;
    for (const userId of users) {
      const ok = await this.prisma.$transaction(async (tx) => {
        if (!(await CouponService.takeQuota(tx, id))) return false;
        await tx.userCoupon.create({ data: { userId, couponId: id } });
        return true;
      });
      if (!ok) {
        quotaExhausted = true;
        break;
      }
      issued += 1;
    }
    await this.audit.log(admin.sub, 'COUPON_ISSUE', id, { requested: targets.length, issued, notFound: notFound.length });
    return { issued, notFound, quotaExhausted };
  }

  @Get(':id/records')
  async records(@Param('id') id: string, @Query() q: CouponRecordQueryDto) {
    const where: Prisma.UserCouponWhereInput = { couponId: id, ...(q.status && { status: q.status }) };
    const [rows, total] = await Promise.all([
      this.prisma.userCoupon.findMany({
        where,
        orderBy: { claimedAt: 'desc' },
        skip: q.skip,
        take: q.pageSize,
        include: { user: { select: { id: true, nickname: true, phoneMasked: true } } },
      }),
      this.prisma.userCoupon.count({ where }),
    ]);
    const orders = await this.prisma.order.findMany({
      where: { id: { in: rows.map((r) => r.usedOrderId).filter((x): x is string => !!x) } },
      select: { id: true, orderNo: true, status: true },
    });
    const orderBy = new Map(orders.map((o) => [o.id, o]));
    return {
      list: rows.map((r) => ({ ...r, order: r.usedOrderId ? (orderBy.get(r.usedOrderId) ?? null) : null })),
      total,
      page: q.page,
      pageSize: q.pageSize,
    };
  }

  private async toData(dto: CouponDto) {
    const data = {
      name: dto.name,
      description: dto.description || null,
      type: dto.type,
      thresholdCent: dto.type === 'DIRECT' ? 0 : dto.thresholdCent,
      discountCent: dto.discountCent,
      scope: dto.scope,
      scopeIds: dto.scope === 'ALL' ? [] : dto.scopeIds,
      totalCount: dto.totalCount,
      perUserLimit: dto.perUserLimit,
      claimable: dto.claimable,
      validFrom: new Date(dto.validFrom),
      validTo: new Date(dto.validTo),
      enabled: dto.enabled,
    };
    const problem = couponConfigProblem(data);
    if (problem) throw new BizException(ErrorCode.BAD_REQUEST, problem);

    if (data.scope !== 'ALL') {
      const found =
        data.scope === 'PRODUCT'
          ? await this.prisma.product.count({ where: { id: { in: data.scopeIds } } })
          : await this.prisma.category.count({ where: { id: { in: data.scopeIds } } });
      if (found !== data.scopeIds.length) throw new BizException(ErrorCode.BAD_REQUEST, '部分适用分类或课程不存在');
    }
    return data;
  }
}
