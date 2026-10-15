import { Body, Controller, Get, NotFoundException, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { AdminRole, EnrollmentStatus, EnrollmentStatusLabel, ErrorCode } from '@luoji/shared';
import type { Prisma } from '@prisma/client';
import type { Response } from 'express';
import { CryptoService } from '../../common/crypto/crypto.service';
import { CurrentAdmin, type AdminTokenPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SkipTransform } from '../../common/decorators/skip-transform.decorator';
import { BizException } from '../../common/exceptions/biz.exception';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderService } from '../order/order.service';
import { AuditService } from './audit.service';

class EnrollmentQueryDto {
  @IsOptional()
  @IsIn(Object.values(EnrollmentStatus))
  status?: EnrollmentStatus;
}

class CancelEnrollmentDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: '请填写取消原因' })
  @MaxLength(100)
  reason: string;
}

/** 线下课报名名单（运营查看 / 取消 / 导出；财务通过订单页退款） */
@ApiTags('后台 · 线下课报名')
@ApiBearerAuth()
@Roles(AdminRole.OPERATOR)
@UseGuards(AdminAuthGuard)
@Controller('admin/v1/offline')
export class AdminEnrollmentController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly orders: OrderService,
    private readonly audit: AuditService,
  ) {}

  private query(sessionId: string, status?: EnrollmentStatus) {
    return this.prisma.enrollment.findMany({
      where: { sessionId, ...(status && { status }) } satisfies Prisma.EnrollmentWhereInput,
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, nickname: true } },
        depositOrder: { select: { orderNo: true, status: true, payCent: true, refundedCent: true, paidAt: true } },
        balanceOrder: { select: { orderNo: true, status: true, payCent: true, refundedCent: true, paidAt: true } },
      },
    });
  }

  @Get('sessions/:sessionId/enrollments')
  async list(@Param('sessionId') sessionId: string, @Query() q: EnrollmentQueryDto) {
    const session = await this.prisma.offlineSession.findUnique({ where: { id: sessionId }, include: { product: { select: { title: true } } } });
    if (!session) throw new NotFoundException('场次不存在');
    const rows = await this.query(sessionId, q.status);
    const counts = await this.prisma.enrollment.groupBy({ by: ['status'], where: { sessionId }, _count: true });
    return {
      session: { id: session.id, title: session.title, productTitle: session.product.title, quota: session.quota, startAt: session.startAt },
      counts: Object.fromEntries(counts.map((c) => [c.status, c._count])),
      list: rows.map(({ contactPhoneEnc: _enc, ...r }) => r),
    };
  }

  /** 查看完整手机号（逐条查看并记审计，用于电话联系学员） */
  @Get('enrollments/:id/phone')
  async phone(@Param('id') id: string, @CurrentAdmin() admin: AdminTokenPayload) {
    const e = await this.prisma.enrollment.findUnique({ where: { id }, select: { contactPhoneEnc: true } });
    if (!e) throw new NotFoundException('报名记录不存在');
    await this.audit.log(admin.sub, 'ENROLLMENT_PHONE_VIEW', id);
    return { phone: this.crypto.decrypt(e.contactPhoneEnc) };
  }

  /**
   * 取消报名：待付定金的同时关闭定金单；已付款的只改报名状态（释放名额），
   * 是否退款由财务在订单页处理。
   */
  @Post('enrollments/:id/cancel')
  async cancel(@Param('id') id: string, @Body() dto: CancelEnrollmentDto, @CurrentAdmin() admin: AdminTokenPayload) {
    const e = await this.prisma.enrollment.findUnique({ where: { id }, include: { depositOrder: { select: { orderNo: true } } } });
    if (!e) throw new NotFoundException('报名记录不存在');
    if (e.status === 'CANCELLED') throw new BizException(ErrorCode.BAD_REQUEST, '该报名已取消');

    // 先改报名状态（保留后台填写的原因），再关闭未支付的定金单
    await this.prisma.enrollment.updateMany({
      where: { id, status: { not: 'CANCELLED' } },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: `后台取消：${dto.reason}` },
    });
    if (e.status === 'DEPOSIT_PENDING' && e.depositOrder) {
      await this.orders.close(e.depositOrder.orderNo).catch(() => undefined);
    }
    await this.audit.log(admin.sub, 'ENROLLMENT_CANCEL', id, { from: e.status, reason: dto.reason });
    return { id, status: 'CANCELLED', needsRefund: e.status !== 'DEPOSIT_PENDING' };
  }

  /** 导出名单 CSV（含完整手机号，记审计） */
  @Get('sessions/:sessionId/enrollments/export')
  @SkipTransform()
  async export(@Param('sessionId') sessionId: string, @Res() res: Response, @CurrentAdmin() admin: AdminTokenPayload) {
    const session = await this.prisma.offlineSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('场次不存在');
    const rows = await this.query(sessionId);
    await this.audit.log(admin.sub, 'ENROLLMENT_EXPORT', sessionId, { rows: rows.length });

    const yuan = (c?: number | null) => (c == null ? '' : (c / 100).toFixed(2));
    const cell = (v: string) => {
      const safe = /^[=+\-@]/.test(v) ? `'${v}` : v;
      return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
    };
    const header = ['联系人', '手机号', '状态', '定金', '尾款', '定金订单', '尾款订单', '报名时间(UTC)', '取消原因'];
    const lines = rows.map((r) =>
      [
        r.contactName,
        this.crypto.decrypt(r.contactPhoneEnc),
        EnrollmentStatusLabel[r.status],
        r.depositOrder?.paidAt ? yuan(r.depositOrder.payCent - r.depositOrder.refundedCent) : '',
        r.balanceOrder?.paidAt ? yuan(r.balanceOrder.payCent - r.balanceOrder.refundedCent) : '',
        r.depositOrder?.orderNo ?? '',
        r.balanceOrder?.orderNo ?? '',
        r.createdAt.toISOString().replace('T', ' ').slice(0, 19),
        r.cancelReason ?? '',
      ]
        .map((v) => cell(String(v)))
        .join(','),
    );
    const filename = encodeURIComponent(`报名名单_${session.title}.csv`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
    res.send('﻿' + [header.join(','), ...lines].join('\r\n'));
  }
}
