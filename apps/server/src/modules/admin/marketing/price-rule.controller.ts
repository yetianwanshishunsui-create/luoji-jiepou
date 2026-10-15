import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminRole, ErrorCode } from '@luoji/shared';
import type { Prisma } from '@prisma/client';
import { CurrentAdmin, type AdminTokenPayload } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { BizException } from '../../../common/exceptions/biz.exception';
import { AdminAuthGuard } from '../../../common/guards/admin-auth.guard';
import { PrismaService } from '../../../prisma/prisma.service';
import { windowsOverlap } from '../../marketing/marketing.rules';
import { AuditService } from '../audit.service';
import { PriceRuleDto, PriceRuleQueryDto } from './marketing.dto';

/** 早鸟价 / 限时价：在时间窗内以更低价格售卖；同一课程启用中的时间窗不能重叠 */
@ApiTags('后台 · 营销 · 价格策略')
@ApiBearerAuth()
@Roles(AdminRole.OPERATOR)
@UseGuards(AdminAuthGuard)
@Controller('admin/v1/marketing/price-rules')
export class AdminPriceRuleController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list(@Query() q: PriceRuleQueryDto) {
    const now = new Date();
    const phase: Prisma.PriceRuleWhereInput =
      q.phase === 'active'
        ? { startAt: { lte: now }, endAt: { gt: now } }
        : q.phase === 'upcoming'
          ? { startAt: { gt: now } }
          : q.phase === 'ended'
            ? { endAt: { lte: now } }
            : {};
    const where: Prisma.PriceRuleWhereInput = { ...phase, ...(q.productId && { productId: q.productId }) };
    const [list, total] = await Promise.all([
      this.prisma.priceRule.findMany({
        where,
        orderBy: [{ startAt: 'desc' }],
        skip: q.skip,
        take: q.pageSize,
        include: { product: { select: { id: true, title: true, priceCent: true, status: true } } },
      }),
      this.prisma.priceRule.count({ where }),
    ]);
    return { list, total, page: q.page, pageSize: q.pageSize };
  }

  @Post()
  async create(@Body() dto: PriceRuleDto, @CurrentAdmin() admin: AdminTokenPayload) {
    const data = await this.validate(dto);
    const rule = await this.prisma.priceRule.create({ data });
    await this.audit.log(admin.sub, 'PRICE_RULE_CREATE', rule.id, { ...dto });
    return rule;
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: PriceRuleDto, @CurrentAdmin() admin: AdminTokenPayload) {
    const exists = await this.prisma.priceRule.count({ where: { id } });
    if (!exists) throw new NotFoundException('价格策略不存在');
    const data = await this.validate(dto, id);
    const rule = await this.prisma.priceRule.update({ where: { id }, data });
    await this.audit.log(admin.sub, 'PRICE_RULE_UPDATE', id, { ...dto });
    return rule;
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentAdmin() admin: AdminTokenPayload) {
    const rule = await this.prisma.priceRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('价格策略不存在');
    await this.prisma.priceRule.delete({ where: { id } });
    await this.audit.log(admin.sub, 'PRICE_RULE_DELETE', id, { productId: rule.productId });
    return true;
  }

  private async validate(dto: PriceRuleDto, selfId?: string) {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    if (endAt <= startAt) throw new BizException(ErrorCode.BAD_REQUEST, '结束时间必须晚于开始时间');

    const product = await this.prisma.product.findUnique({ where: { id: dto.productId }, select: { type: true, pricingMode: true, priceCent: true } });
    if (!product) throw new BizException(ErrorCode.BAD_REQUEST, '课程不存在');
    if (product.type === 'OFFLINE' || product.pricingMode === 'FREE') {
      throw new BizException(ErrorCode.BAD_REQUEST, '免费课程和线下课不能设置价格策略');
    }
    if (dto.priceCent >= product.priceCent) {
      throw new BizException(ErrorCode.BAD_REQUEST, `活动价必须低于原价 ¥${(product.priceCent / 100).toFixed(2)}`);
    }

    if (dto.enabled) {
      const others = await this.prisma.priceRule.findMany({
        where: { productId: dto.productId, enabled: true, ...(selfId && { id: { not: selfId } }) },
        select: { startAt: true, endAt: true },
      });
      if (others.some((o) => windowsOverlap(o, { startAt, endAt }))) {
        throw new BizException(ErrorCode.BAD_REQUEST, '与该课程已有的价格策略时间重叠');
      }
    }
    return { productId: dto.productId, type: dto.type, priceCent: dto.priceCent, startAt, endAt, enabled: dto.enabled };
  }
}
