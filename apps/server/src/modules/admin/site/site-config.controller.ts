import { Body, Controller, Get, Param, ParseEnumPipe, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AdminRole,
  DEFAULT_JOIN_PAGE,
  ErrorCode,
  homeSlotsKey,
  IdentityType,
  JOIN_PAGE_KEY,
  type HomeSlotsConfig,
  type JoinPageConfig,
} from '@luoji/shared';
import { CurrentAdmin, type AdminTokenPayload } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { BizException } from '../../../common/exceptions/biz.exception';
import { AdminAuthGuard } from '../../../common/guards/admin-auth.guard';
import { isVisibleTo } from '../../../common/visibility';
import { PrismaService } from '../../../prisma/prisma.service';
import { SiteConfigService } from '../../site/site-config.service';
import { HomeSlotsDto, JoinPageDto } from '../../site/site.dto';
import { AuditService } from '../audit.service';

@ApiTags('后台 · 运营配置')
@ApiBearerAuth()
@Roles(AdminRole.OPERATOR)
@UseGuards(AdminAuthGuard)
@Controller('admin/v1/site')
export class AdminSiteConfigController {
  constructor(
    private readonly site: SiteConfigService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** 首页推荐配置，附带课程信息用于回显；对该身份不可见 / 未上架的课程会标注出来 */
  @Get('home-slots/:identity')
  async homeSlots(@Param('identity', new ParseEnumPipe(IdentityType)) identity: IdentityType) {
    const { value, updatedAt } = await this.site.getWithMeta<HomeSlotsConfig>(homeSlotsKey(identity), { sections: [] });
    const ids = [...new Set(value.sections.flatMap((s) => s.productIds))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, title: true, cover: true, type: true, status: true, priceCent: true, pricingMode: true, visibleTo: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    return {
      updatedAt,
      sections: value.sections.map((s) => ({
        title: s.title,
        products: s.productIds.map((id) => {
          const p = byId.get(id);
          if (!p) return { id, title: '（课程已删除）', missing: true, warning: '已删除' };
          const { visibleTo, ...rest } = p;
          const warning = p.status !== 'ONLINE' ? '未上架' : !isVisibleTo(visibleTo, identity) ? '对该身份不可见' : null;
          return { ...rest, missing: false, warning };
        }),
      })),
    };
  }

  @Put('home-slots/:identity')
  async saveHomeSlots(
    @Param('identity', new ParseEnumPipe(IdentityType)) identity: IdentityType,
    @Body() dto: HomeSlotsDto,
    @CurrentAdmin() admin: AdminTokenPayload,
  ) {
    const ids = [...new Set(dto.sections.flatMap((s) => s.productIds))];
    const found = await this.prisma.product.count({ where: { id: { in: ids } } });
    if (found !== ids.length) throw new BizException(ErrorCode.BAD_REQUEST, '部分课程不存在，请刷新后重试');

    const value: HomeSlotsConfig = { sections: dto.sections.map((s) => ({ title: s.title, productIds: s.productIds })) };
    await this.site.set(homeSlotsKey(identity), value);
    await this.audit.log(admin.sub, 'HOME_SLOTS_UPDATE', identity, { sections: value.sections.length });
    return this.homeSlots(identity);
  }

  @Get('join-page')
  joinPage() {
    return this.site.getWithMeta<JoinPageConfig>(JOIN_PAGE_KEY, DEFAULT_JOIN_PAGE);
  }

  @Put('join-page')
  async saveJoinPage(@Body() dto: JoinPageDto, @CurrentAdmin() admin: AdminTokenPayload) {
    const value: JoinPageConfig = {
      hero: { title: dto.hero.title, subtitle: dto.hero.subtitle, image: dto.hero.image || null },
      benefits: dto.benefits.map((b) => ({ title: b.title, desc: b.desc })),
      cases: dto.cases.map((c) => ({ title: c.title, desc: c.desc, image: c.image || null })),
      faqs: dto.faqs.map((f) => ({ q: f.q, a: f.a })),
      formTitle: dto.formTitle,
      submitText: dto.submitText,
      successText: dto.successText,
    };
    await this.site.set(JOIN_PAGE_KEY, value);
    await this.audit.log(admin.sub, 'JOIN_PAGE_UPDATE');
    return this.joinPage();
  }
}
