import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCode, PricingMode, type IdentityType } from '@luoji/shared';
import { BizException } from '../../common/exceptions/biz.exception';
import { isVisibleTo } from '../../common/visibility';
import { WechatService } from '../../integrations/wechat/wechat.service';
import { PrismaService } from '../../prisma/prisma.service';
import { canReview, ratingSummary, reviewProblem, reviewerName, statusAfterSecCheck } from './review.rules';

/** 线下课：已付定金或报名完成视为“购买过” */
const ENROLLED = ['DEPOSIT_PAID', 'COMPLETED'] as const;

type ReviewRow = {
  id: string;
  userId: string;
  rating: number;
  content: string;
  anonymous: boolean;
  status: string;
  featured: boolean;
  reply: string | null;
  createdAt: Date;
  user: { nickname: string | null; avatar: string | null };
};

@Injectable()
export class ReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wechat: WechatService,
  ) {}

  private view(r: ReviewRow) {
    return {
      id: r.id,
      name: reviewerName(r.anonymous, r.user.nickname),
      avatar: r.anonymous ? null : r.user.avatar,
      rating: r.rating,
      content: r.content,
      featured: r.featured,
      reply: r.reply,
      createdAt: r.createdAt,
    };
  }

  private async product(identity: IdentityType, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, status: 'ONLINE' },
      select: { id: true, type: true, pricingMode: true, visibleTo: true },
    });
    if (!product) throw new NotFoundException('课程不存在或已下架');
    if (!isVisibleTo(product.visibleTo, identity)) throw new BizException(ErrorCode.CONTENT_NOT_VISIBLE, '该内容对当前身份不可见');
    return product;
  }

  /** 是否购买过：直接权益、所在专栏 / 系列的权益，或线下课已报名 */
  private async eligible(userId: string, product: { id: string; type: string; pricingMode: string }) {
    const now = new Date();
    const [owned, enrolled] = await Promise.all([
      this.prisma.entitlement.count({
        where: {
          userId,
          OR: [{ expireAt: null }, { expireAt: { gt: now } }],
          AND: [{ OR: [{ productId: product.id }, { product: { children: { some: { childProductId: product.id } } } }] }],
        },
      }),
      product.type === 'OFFLINE'
        ? this.prisma.enrollment.count({ where: { userId, status: { in: [...ENROLLED] }, session: { productId: product.id } } })
        : 0,
    ]);
    return canReview({ free: product.pricingMode === PricingMode.FREE, owned: owned > 0, enrolled: enrolled > 0 });
  }

  /** 详情页评价区：汇总 + 列表（精选在前）+ 我的评价 + 是否可评 */
  async list(userId: string, identity: IdentityType, productId: string, page: number, pageSize: number) {
    const product = await this.product(identity, productId);
    const where = { productId, status: 'VISIBLE' as const };
    const [ratings, rows, mine, can] = await Promise.all([
      this.prisma.productReview.findMany({ where, select: { rating: true } }),
      this.prisma.productReview.findMany({
        where,
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { user: { select: { nickname: true, avatar: true } } },
      }),
      this.prisma.productReview.findUnique({
        where: { productId_userId: { productId, userId } },
        include: { user: { select: { nickname: true, avatar: true } } },
      }),
      this.eligible(userId, product),
    ]);
    return {
      ...ratingSummary(ratings.map((r) => r.rating)),
      list: rows.map((r) => this.view(r)),
      page,
      pageSize,
      canReview: can,
      mine: mine ? { ...this.view(mine), status: mine.status, anonymous: mine.anonymous } : null,
    };
  }

  /** 提交或修改评价：每人每门课一条，修改后重新检测 */
  async submit(userId: string, openid: string, identity: IdentityType, productId: string, dto: { rating: number; content: string; anonymous: boolean }) {
    const problem = reviewProblem(dto);
    if (problem) throw new BizException(ErrorCode.BAD_REQUEST, problem);
    const product = await this.product(identity, productId);
    if (!(await this.eligible(userId, product))) {
      throw new BizException(ErrorCode.FORBIDDEN, '购买后才能评价该课程', HttpStatus.FORBIDDEN);
    }
    const content = dto.content.trim();
    const status = statusAfterSecCheck(await this.wechat.msgSecCheck(openid, content));
    if (!status) throw new BizException(ErrorCode.BAD_REQUEST, '评价内容含有不当信息，请修改后再提交');

    const data = { rating: dto.rating, content, anonymous: dto.anonymous, status };
    const review = await this.prisma.productReview.upsert({
      where: { productId_userId: { productId, userId } },
      create: { productId, userId, ...data },
      // 修改后取消精选，官方回复保留
      update: { ...data, featured: false },
    });
    return { id: review.id, status: review.status };
  }
}
