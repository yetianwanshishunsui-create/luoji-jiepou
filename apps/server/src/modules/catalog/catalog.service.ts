import { Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCode, homeSlotsKey, PricingMode, type HomeSlotsConfig, type IdentityType, type PageResult } from '@luoji/shared';
import type { PriceRule, Prisma, ProductType } from '@prisma/client';
import { BizException } from '../../common/exceptions/biz.exception';
import { isVisibleTo, visibleFor } from '../../common/visibility';
import { PrismaService } from '../../prisma/prisma.service';
import { SiteConfigService } from '../site/site-config.service';
import { activeRule } from '../marketing/marketing.rules';
import { effectivePrice } from '../order/pricing';

/** 早鸟 / 限时价标签与结束时间（倒计时） */
function ruleView(base: number, rules: PriceRule[]) {
  const r = activeRule(base, rules);
  return r && { type: r.type, endAt: r.endAt };
}

/** 课程卡片字段（线下课附带未开始场次的定金，用于展示“定金 ¥x 起”） */
const cardSelect = () =>
  ({
    id: true,
    type: true,
    title: true,
    subtitle: true,
    cover: true,
    pricingMode: true,
    priceCent: true,
    originCent: true,
    priceRules: { where: { enabled: true } },
    sessions: { where: { enabled: true, startAt: { gt: new Date() } }, select: { depositCent: true } },
  }) satisfies Prisma.ProductSelect;

function toCard({ priceRules, sessions, ...p }: Prisma.ProductGetPayload<{ select: ReturnType<typeof cardSelect> }>) {
  return {
    ...p,
    currentPriceCent: effectivePrice(p.priceCent, priceRules),
    priceRule: ruleView(p.priceCent, priceRules),
    minDepositCent: p.type === 'OFFLINE' && sessions.length ? Math.min(...sessions.map((x) => x.depositCent)) : null,
  };
}

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly site: SiteConfigService,
  ) {}

  /**
   * 首页：Banner + 按身份配置的推荐栏目。
   * 栏目里未上架 / 对当前身份不可见的课程自动跳过；未配置时退回“最新课程”。
   */
  async home(identity: IdentityType) {
    const now = new Date();
    const [banners, slots] = await Promise.all([
      this.prisma.banner.findMany({
        where: {
          enabled: true,
          position: 'HOME_TOP',
          OR: [{ identityType: null }, { identityType: identity }],
          AND: [
            { OR: [{ onlineAt: null }, { onlineAt: { lte: now } }] },
            { OR: [{ offlineAt: null }, { offlineAt: { gt: now } }] },
          ],
        },
        orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
        select: { id: true, title: true, image: true, link: true },
      }),
      this.site.get<HomeSlotsConfig>(homeSlotsKey(identity), { sections: [] }),
    ]);

    let sections: { title: string; products: unknown[] }[];
    if (slots.sections.length) {
      const ids = [...new Set(slots.sections.flatMap((s) => s.productIds))];
      const rows = await this.prisma.product.findMany({
        where: { id: { in: ids }, status: 'ONLINE', visibleTo: visibleFor(identity) },
        select: cardSelect(),
      });
      const byId = new Map(rows.map((r) => [r.id, toCard(r)]));
      sections = slots.sections
        .map((s) => ({ title: s.title, products: s.productIds.map((id) => byId.get(id)).filter(Boolean) }))
        .filter((s) => s.products.length > 0);
    } else {
      sections = [{ title: '为你推荐', products: (await this.list(identity, { page: 1, pageSize: 10 })).list }];
    }
    return { banners, sections };
  }

  async categories(identity: IdentityType) {
    const all = await this.prisma.category.findMany({
      where: { enabled: true, visibleTo: visibleFor(identity) },
      orderBy: { sort: 'asc' },
      select: { id: true, parentId: true, name: true },
    });
    return all
      .filter((c) => !c.parentId)
      .map((root) => ({ ...root, children: all.filter((c) => c.parentId === root.id) }));
  }

  async list(
    identity: IdentityType,
    q: { page: number; pageSize: number; categoryId?: string; type?: ProductType },
  ): Promise<PageResult<unknown>> {
    const where: Prisma.ProductWhereInput = {
      status: 'ONLINE',
      visibleTo: visibleFor(identity),
      ...(q.type && { type: q.type }),
      ...(q.categoryId && { OR: [{ categoryId: q.categoryId }, { category: { parentId: q.categoryId } }] }),
    };
    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        select: cardSelect(),
      }),
      this.prisma.product.count({ where }),
    ]);
    const list = rows.map(toCard);
    return { list, total, page: q.page, pageSize: q.pageSize };
  }

  async detail(identity: IdentityType, userId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, status: 'ONLINE' },
      include: {
        priceRules: { where: { enabled: true } },
        chapters: {
          orderBy: { sort: 'asc' },
          include: {
            lessons: {
              orderBy: { sort: 'asc' },
              // 不下发 vodFileId / audioKey，播放地址必须走 play-sign 鉴权
              select: { id: true, type: true, title: true, duration: true, isTrial: true, trialSeconds: true },
            },
          },
        },
        children: { orderBy: { sort: 'asc' }, include: { childProduct: { select: { id: true, title: true, cover: true, type: true } } } },
        sessions: { where: { enabled: true, startAt: { gt: new Date() } }, orderBy: { startAt: 'asc' } },
      },
    });
    if (!product) throw new NotFoundException('课程不存在或已下架');
    if (!isVisibleTo(product.visibleTo, identity)) {
      throw new BizException(ErrorCode.CONTENT_NOT_VISIBLE, '该内容对当前身份不可见');
    }

    const owned =
      product.pricingMode === PricingMode.FREE ||
      !!(await this.prisma.entitlement.findUnique({ where: { userId_productId: { userId, productId: id } } }));

    const { priceRules, children, ...rest } = product;
    return {
      ...rest,
      items: children.map((c) => c.childProduct),
      currentPriceCent: effectivePrice(product.priceCent, priceRules),
      priceRule: ruleView(product.priceCent, priceRules),
      minDepositCent: product.type === 'OFFLINE' && product.sessions.length ? Math.min(...product.sessions.map((x) => x.depositCent)) : null,
      owned,
    };
  }
}
