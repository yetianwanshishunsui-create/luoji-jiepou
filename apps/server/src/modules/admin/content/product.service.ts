import { Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCode } from '@luoji/shared';
import type { Prisma } from '@prisma/client';
import { BizException } from '../../../common/exceptions/biz.exception';
import { cleanHtml } from '../../../common/html';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../audit.service';
import type { CreateProductDto, OfflineSessionDto, ProductQueryDto, UpdateProductDto } from './content.dto';
import { ACTIVE_STATUSES } from '../../offline/enrollment.rules';
import { publishProblems } from './publish-check';

@Injectable()
export class AdminProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(q: ProductQueryDto) {
    const where: Prisma.ProductWhereInput = {
      ...(q.type && { type: q.type }),
      ...(q.status && { status: q.status }),
      ...(q.categoryId && { OR: [{ categoryId: q.categoryId }, { category: { parentId: q.categoryId } }] }),
      ...(q.keyword && { title: { contains: q.keyword } }),
    };
    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
        skip: q.skip,
        take: q.pageSize,
        select: {
          id: true,
          type: true,
          title: true,
          cover: true,
          pricingMode: true,
          priceCent: true,
          status: true,
          sort: true,
          visibleTo: true,
          updatedAt: true,
          category: { select: { id: true, name: true } },
          _count: { select: { chapters: true, children: true, sessions: true, entitlements: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);
    return { list: rows, total, page: q.page, pageSize: q.pageSize };
  }

  async detail(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, parentId: true } },
        chapters: { orderBy: { sort: 'asc' }, include: { lessons: { orderBy: { sort: 'asc' } } } },
        children: {
          orderBy: { sort: 'asc' },
          include: { childProduct: { select: { id: true, title: true, type: true, status: true, priceCent: true } } },
        },
        // 名额只统计有效报名（已取消的不占名额）
        sessions: {
          orderBy: { startAt: 'asc' },
          include: { _count: { select: { enrollments: { where: { status: { in: [...ACTIVE_STATUSES] } } } } } },
        },
        _count: { select: { orderItems: true, entitlements: true } },
      },
    });
    if (!product) throw new NotFoundException('课程不存在');
    return product;
  }

  async create(dto: CreateProductDto, adminId: string) {
    await this.assertCategory(dto.categoryId);
    const product = await this.prisma.product.create({ data: { ...this.toData(dto), type: dto.type, status: 'DRAFT' } });
    await this.audit.log(adminId, 'PRODUCT_CREATE', product.id, { title: product.title, type: product.type });
    return product;
  }

  async update(id: string, dto: UpdateProductDto, adminId: string) {
    const current = await this.prisma.product.findUnique({ where: { id }, select: { id: true } });
    if (!current) throw new NotFoundException('课程不存在');
    await this.assertCategory(dto.categoryId);
    const product = await this.prisma.product.update({ where: { id }, data: this.toData(dto) });
    await this.audit.log(adminId, 'PRODUCT_UPDATE', id, { title: product.title, priceCent: product.priceCent });
    return product;
  }

  /** 上架前跑完整性校验；下架 / 转草稿不受限 */
  async setStatus(id: string, status: 'DRAFT' | 'ONLINE' | 'OFFLINE', adminId: string) {
    const p = await this.prisma.product.findUnique({
      where: { id },
      include: {
        chapters: { select: { lessons: { select: { type: true, vodFileId: true } } } },
        sessions: { where: { enabled: true, startAt: { gt: new Date() } }, select: { id: true } },
        children: { select: { childProduct: { select: { status: true } } } },
      },
    });
    if (!p) throw new NotFoundException('课程不存在');

    if (status === 'ONLINE') {
      const lessons = p.chapters.flatMap((c) => c.lessons);
      const problems = publishProblems({
        type: p.type,
        pricingMode: p.pricingMode,
        priceCent: p.priceCent,
        title: p.title,
        visibleTo: p.visibleTo,
        lessonCount: lessons.length,
        videoWithoutFile: lessons.filter((l) => l.type === 'VIDEO' && !l.vodFileId).length,
        itemCount: p.children.length,
        offlineItemCount: p.children.filter((c) => c.childProduct.status !== 'ONLINE').length,
        upcomingSessionCount: p.sessions.length,
      });
      if (problems.length) throw new BizException(ErrorCode.BAD_REQUEST, `暂不能上架：${problems.join('；')}`);
    }

    await this.prisma.product.update({ where: { id }, data: { status } });
    await this.audit.log(adminId, 'PRODUCT_STATUS', id, { status });
    return { id, status };
  }

  /**
   * 删除：只允许删除未上架、且从未产生过订单 / 权益的课程；有交易记录的只能下架。
   * 目录、学习记录、价格规则、所属专栏关系一并删除。
   */
  async remove(id: string, adminId: string) {
    const p = await this.prisma.product.findUnique({
      where: { id },
      include: { _count: { select: { orderItems: true, entitlements: true } }, sessions: { select: { _count: { select: { enrollments: true } } } } },
    });
    if (!p) throw new NotFoundException('课程不存在');
    if (p.status === 'ONLINE') throw new BizException(ErrorCode.BAD_REQUEST, '请先下架再删除');
    if (p._count.orderItems > 0 || p._count.entitlements > 0 || p.sessions.some((s) => s._count.enrollments > 0)) {
      throw new BizException(ErrorCode.BAD_REQUEST, '该课程已有订单或学员，不能删除，请保持下架状态');
    }

    await this.prisma.$transaction(async (tx) => {
      const lessonIds = (
        await tx.lesson.findMany({ where: { chapter: { productId: id } }, select: { id: true } })
      ).map((l) => l.id);
      await tx.learningProgress.deleteMany({ where: { lessonId: { in: lessonIds } } });
      await tx.lesson.deleteMany({ where: { id: { in: lessonIds } } });
      await tx.chapter.deleteMany({ where: { productId: id } });
      await tx.productItem.deleteMany({ where: { OR: [{ productId: id }, { childProductId: id }] } });
      await tx.priceRule.deleteMany({ where: { productId: id } });
      await tx.offlineSession.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
    });
    await this.audit.log(adminId, 'PRODUCT_DELETE', id, { title: p.title });
    return true;
  }

  /** 设置专栏 / 系列包含的课程（整体替换，按数组顺序排序） */
  async setItems(id: string, childIds: string[], adminId: string) {
    const p = await this.prisma.product.findUnique({ where: { id }, select: { type: true } });
    if (!p) throw new NotFoundException('课程不存在');
    if (p.type !== 'COLUMN' && p.type !== 'SERIES') throw new BizException(ErrorCode.BAD_REQUEST, '只有专栏 / 系列可以包含课程');
    if (childIds.includes(id)) throw new BizException(ErrorCode.BAD_REQUEST, '不能包含自己');

    const children = await this.prisma.product.findMany({ where: { id: { in: childIds } }, select: { id: true, type: true } });
    if (children.length !== childIds.length) throw new BizException(ErrorCode.BAD_REQUEST, '部分课程不存在');
    if (children.some((c) => c.type !== 'COURSE')) throw new BizException(ErrorCode.BAD_REQUEST, '专栏 / 系列只能包含单课');

    await this.prisma.$transaction([
      this.prisma.productItem.deleteMany({ where: { productId: id } }),
      this.prisma.productItem.createMany({ data: childIds.map((childProductId, sort) => ({ productId: id, childProductId, sort })) }),
    ]);
    await this.audit.log(adminId, 'PRODUCT_ITEMS', id, { childIds });
    return true;
  }

  // ───────── 线下课场次 ─────────

  async createSession(productId: string, dto: OfflineSessionDto, adminId: string) {
    const p = await this.prisma.product.findUnique({ where: { id: productId }, select: { type: true } });
    if (!p) throw new NotFoundException('课程不存在');
    if (p.type !== 'OFFLINE') throw new BizException(ErrorCode.BAD_REQUEST, '只有线下课可以添加场次');
    const session = await this.prisma.offlineSession.create({ data: { productId, ...this.sessionData(dto) } });
    await this.audit.log(adminId, 'SESSION_CREATE', session.id, { productId });
    return session;
  }

  async updateSession(sessionId: string, dto: OfflineSessionDto, adminId: string) {
    const s = await this.prisma.offlineSession.findUnique({
      where: { id: sessionId },
      include: { _count: { select: { enrollments: { where: { status: { in: [...ACTIVE_STATUSES] } } } } } },
    });
    if (!s) throw new NotFoundException('场次不存在');
    const data = this.sessionData(dto);
    if (s._count.enrollments > 0 && (data.depositCent !== s.depositCent || data.balanceCent !== s.balanceCent)) {
      throw new BizException(ErrorCode.BAD_REQUEST, '已有学员报名，不能修改定金 / 尾款金额');
    }
    if (data.quota < s._count.enrollments) throw new BizException(ErrorCode.BAD_REQUEST, `名额不能少于已报名人数（${s._count.enrollments}）`);
    const session = await this.prisma.offlineSession.update({ where: { id: sessionId }, data });
    await this.audit.log(adminId, 'SESSION_UPDATE', sessionId);
    return session;
  }

  async removeSession(sessionId: string, adminId: string) {
    const s = await this.prisma.offlineSession.findUnique({ where: { id: sessionId }, include: { _count: { select: { enrollments: true } } } });
    if (!s) throw new NotFoundException('场次不存在');
    if (s._count.enrollments > 0) throw new BizException(ErrorCode.BAD_REQUEST, '已有学员报名，不能删除，可停用该场次');
    await this.prisma.offlineSession.delete({ where: { id: sessionId } });
    await this.audit.log(adminId, 'SESSION_DELETE', sessionId);
    return true;
  }

  private sessionData(dto: OfflineSessionDto) {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    const balanceDueAt = new Date(dto.balanceDueAt);
    if (endAt <= startAt) throw new BizException(ErrorCode.BAD_REQUEST, '结束时间必须晚于开始时间');
    if (balanceDueAt > startAt) throw new BizException(ErrorCode.BAD_REQUEST, '尾款截止时间不能晚于开课时间');
    return {
      title: dto.title,
      address: dto.address,
      quota: dto.quota,
      depositCent: dto.depositCent,
      balanceCent: dto.balanceCent,
      startAt,
      endAt,
      balanceDueAt,
      enabled: dto.enabled ?? true,
    };
  }

  private toData(dto: UpdateProductDto) {
    if (dto.originCent != null && dto.originCent <= dto.priceCent) {
      throw new BizException(ErrorCode.BAD_REQUEST, '划线价必须高于售价');
    }
    return {
      title: dto.title.trim(),
      subtitle: dto.subtitle?.trim() || null,
      cover: dto.cover || null,
      detailHtml: cleanHtml(dto.detailHtml),
      pricingMode: dto.pricingMode,
      priceCent: dto.pricingMode === 'FREE' ? 0 : dto.priceCent,
      originCent: dto.pricingMode === 'FREE' ? null : (dto.originCent ?? null),
      visibleTo: dto.visibleTo,
      categoryId: dto.categoryId || null,
      sort: dto.sort ?? 0,
    };
  }

  private async assertCategory(categoryId?: string | null) {
    if (!categoryId) return;
    const exists = await this.prisma.category.count({ where: { id: categoryId } });
    if (!exists) throw new BizException(ErrorCode.BAD_REQUEST, '分类不存在');
  }
}
