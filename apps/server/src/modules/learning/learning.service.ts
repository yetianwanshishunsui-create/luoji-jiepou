import { Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCode, PricingMode, type IdentityType } from '@luoji/shared';
import { BizException } from '../../common/exceptions/biz.exception';
import { isVisibleTo } from '../../common/visibility';
import { PrismaService } from '../../prisma/prisma.service';
import { decideLessonAccess } from './access';

/** 观看达到该比例记为完成 */
const COMPLETE_RATIO = 0.9;

@Injectable()
export class LearningService {
  constructor(private readonly prisma: PrismaService) {}

  /** 是否拥有产品权益：直接购买，或购买了包含它的专栏 / 系列 */
  private async owns(userId: string, productId: string) {
    const now = new Date();
    const count = await this.prisma.entitlement.count({
      where: {
        userId,
        OR: [{ expireAt: null }, { expireAt: { gt: now } }],
        AND: [{ OR: [{ productId }, { product: { children: { some: { childProductId: productId } } } }] }],
      },
    });
    return count > 0;
  }

  async playSign(userId: string, identity: IdentityType, lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { chapter: { include: { product: { select: { id: true, pricingMode: true, visibleTo: true, status: true } } } } },
    });
    const product = lesson?.chapter.product;
    if (!lesson || !product || product.status !== 'ONLINE') throw new NotFoundException('课时不存在');
    if (!isVisibleTo(product.visibleTo, identity)) {
      throw new BizException(ErrorCode.CONTENT_NOT_VISIBLE, '该内容对当前身份不可见');
    }

    const access = decideLessonAccess({
      productFree: product.pricingMode === PricingMode.FREE,
      owned: await this.owns(userId, product.id),
      isTrial: lesson.isTrial,
      trialSeconds: lesson.trialSeconds,
    });
    if (access.mode === 'DENY') {
      throw new BizException(ErrorCode.CONTENT_NOT_PURCHASED, '购买后即可观看');
    }

    const progress = await this.prisma.learningProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
      select: { position: true },
    });

    return {
      lessonId,
      type: lesson.type,
      access,
      resumeAt: progress?.position ?? 0,
      // TODO(WP05)：VIDEO 用腾讯云 VOD 生成播放器签名 psign（含过期时间、试看时长、Key 防盗链）；
      //            AUDIO 生成 COS 签名 URL；ARTICLE 直接返回 contentHtml。
      fileId: lesson.type === 'VIDEO' ? lesson.vodFileId : null,
      psign: null as string | null,
      contentHtml: lesson.type === 'ARTICLE' ? lesson.contentHtml : null,
    };
  }

  /**
   * 上报进度。一期直接 upsert；并发上来后改为写 Redis + 定时批量落库（技术方案 4.3）。
   */
  async report(userId: string, lessonId: string, position: number, duration: number) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId }, select: { duration: true, type: true } });
    if (!lesson) throw new NotFoundException('课时不存在');

    const total = lesson.duration || duration;
    const pos = Math.min(position, total || position);
    // 图文课时打开即视为完成
    const completed = lesson.type === 'ARTICLE' || (total > 0 && pos >= total * COMPLETE_RATIO);

    await this.prisma.learningProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: { userId, lessonId, position: pos, duration: total, completed },
      // 已完成的不回退为未完成
      update: { position: pos, duration: total, ...(completed && { completed: true }) },
    });
    return { completed };
  }

  /** 学习中心：我的课程 + 进度 */
  async myCourses(userId: string) {
    const ents = await this.prisma.entitlement.findMany({
      where: { userId, OR: [{ expireAt: null }, { expireAt: { gt: new Date() } }] },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            cover: true,
            type: true,
            chapters: { select: { lessons: { select: { id: true } } } },
          },
        },
      },
    });

    const lessonIds = ents.flatMap((e) => e.product.chapters.flatMap((c) => c.lessons.map((l) => l.id)));
    const progresses = await this.prisma.learningProgress.findMany({
      where: { userId, lessonId: { in: lessonIds } },
      select: { lessonId: true, completed: true, updatedAt: true },
    });
    const byLesson = new Map(progresses.map((p) => [p.lessonId, p]));

    return ents.map(({ product }) => {
      const ids = product.chapters.flatMap((c) => c.lessons.map((l) => l.id));
      const done = ids.filter((id) => byLesson.get(id)?.completed).length;
      const last = ids
        .map((id) => byLesson.get(id))
        .filter(Boolean)
        .sort((a, b) => b!.updatedAt.getTime() - a!.updatedAt.getTime())[0];
      return {
        id: product.id,
        title: product.title,
        cover: product.cover,
        type: product.type,
        lessonCount: ids.length,
        completedCount: done,
        progress: ids.length ? Math.round((done / ids.length) * 100) : 0,
        lastLessonId: last?.lessonId ?? null,
        lastStudyAt: last?.updatedAt ?? null,
      };
    });
  }
}
