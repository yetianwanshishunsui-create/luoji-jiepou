import { Body, Controller, Delete, NotFoundException, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminRole, ErrorCode } from '@luoji/shared';
import { CurrentAdmin, type AdminTokenPayload } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { BizException } from '../../../common/exceptions/biz.exception';
import { AdminAuthGuard } from '../../../common/guards/admin-auth.guard';
import { cleanHtml } from '../../../common/html';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../audit.service';
import { ChapterDto, LessonDto, SortDto } from './content.dto';

/** 课程目录：章节与课时（仅单课 COURSE 有目录） */
@ApiTags('后台 · 内容 · 目录')
@ApiBearerAuth()
@Roles(AdminRole.OPERATOR)
@UseGuards(AdminAuthGuard)
@Controller('admin/v1/content')
export class AdminCurriculumController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ───────── 章节 ─────────

  @Post('products/:productId/chapters')
  async createChapter(@Param('productId') productId: string, @Body() dto: ChapterDto, @CurrentAdmin() admin: AdminTokenPayload) {
    const p = await this.prisma.product.findUnique({ where: { id: productId }, select: { type: true } });
    if (!p) throw new NotFoundException('课程不存在');
    if (p.type !== 'COURSE') throw new BizException(ErrorCode.BAD_REQUEST, '只有单课可以编辑目录');

    const last = await this.prisma.chapter.findFirst({ where: { productId }, orderBy: { sort: 'desc' }, select: { sort: true } });
    const chapter = await this.prisma.chapter.create({ data: { productId, title: dto.title, sort: (last?.sort ?? -1) + 1 } });
    await this.audit.log(admin.sub, 'CHAPTER_CREATE', chapter.id, { productId });
    return { ...chapter, lessons: [] };
  }

  @Put('chapters/:id')
  async updateChapter(@Param('id') id: string, @Body() dto: ChapterDto) {
    await this.mustChapter(id);
    return this.prisma.chapter.update({ where: { id }, data: { title: dto.title } });
  }

  @Delete('chapters/:id')
  async removeChapter(@Param('id') id: string, @CurrentAdmin() admin: AdminTokenPayload) {
    const chapter = await this.mustChapter(id);
    const lessons = await this.prisma.lesson.count({ where: { chapterId: id } });
    if (lessons > 0) throw new BizException(ErrorCode.BAD_REQUEST, '请先删除章节下的课时');
    await this.prisma.chapter.delete({ where: { id } });
    await this.audit.log(admin.sub, 'CHAPTER_DELETE', id, { productId: chapter.productId });
    return true;
  }

  @Put('products/:productId/chapters/sort')
  async sortChapters(@Param('productId') productId: string, @Body() dto: SortDto) {
    const existing = await this.prisma.chapter.findMany({ where: { productId }, select: { id: true } });
    this.assertSameSet(existing.map((c) => c.id), dto.ids);
    await this.prisma.$transaction(dto.ids.map((id, sort) => this.prisma.chapter.update({ where: { id }, data: { sort } })));
    return true;
  }

  // ───────── 课时 ─────────

  @Post('chapters/:chapterId/lessons')
  async createLesson(@Param('chapterId') chapterId: string, @Body() dto: LessonDto, @CurrentAdmin() admin: AdminTokenPayload) {
    await this.mustChapter(chapterId);
    const last = await this.prisma.lesson.findFirst({ where: { chapterId }, orderBy: { sort: 'desc' }, select: { sort: true } });
    const lesson = await this.prisma.lesson.create({ data: { chapterId, ...this.lessonData(dto), sort: (last?.sort ?? -1) + 1 } });
    await this.audit.log(admin.sub, 'LESSON_CREATE', lesson.id, { chapterId, title: lesson.title });
    return lesson;
  }

  @Put('lessons/:id')
  async updateLesson(@Param('id') id: string, @Body() dto: LessonDto, @CurrentAdmin() admin: AdminTokenPayload) {
    const exists = await this.prisma.lesson.count({ where: { id } });
    if (!exists) throw new NotFoundException('课时不存在');
    const lesson = await this.prisma.lesson.update({ where: { id }, data: this.lessonData(dto) });
    await this.audit.log(admin.sub, 'LESSON_UPDATE', id, { title: lesson.title });
    return lesson;
  }

  /** 删除课时会同时删除学员在该课时的学习记录 */
  @Delete('lessons/:id')
  async removeLesson(@Param('id') id: string, @CurrentAdmin() admin: AdminTokenPayload) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id }, select: { title: true } });
    if (!lesson) throw new NotFoundException('课时不存在');
    await this.prisma.$transaction([
      this.prisma.learningProgress.deleteMany({ where: { lessonId: id } }),
      this.prisma.lesson.delete({ where: { id } }),
    ]);
    await this.audit.log(admin.sub, 'LESSON_DELETE', id, { title: lesson.title });
    return true;
  }

  @Put('chapters/:chapterId/lessons/sort')
  async sortLessons(@Param('chapterId') chapterId: string, @Body() dto: SortDto) {
    const existing = await this.prisma.lesson.findMany({ where: { chapterId }, select: { id: true } });
    this.assertSameSet(existing.map((l) => l.id), dto.ids);
    await this.prisma.$transaction(dto.ids.map((id, sort) => this.prisma.lesson.update({ where: { id }, data: { sort } })));
    return true;
  }

  /** 按类型只保留相关字段，避免切换类型后残留旧数据 */
  private lessonData(dto: LessonDto) {
    if (dto.isTrial && dto.duration > 0 && dto.trialSeconds > dto.duration) {
      throw new BizException(ErrorCode.BAD_REQUEST, '试看时长不能超过课时时长');
    }
    if (dto.type === 'ARTICLE' && !dto.contentHtml?.trim()) {
      throw new BizException(ErrorCode.BAD_REQUEST, '图文课时内容不能为空');
    }
    return {
      type: dto.type,
      title: dto.title.trim(),
      vodFileId: dto.type === 'VIDEO' ? dto.vodFileId?.trim() || null : null,
      audioKey: dto.type === 'AUDIO' ? dto.audioKey?.trim() || null : null,
      contentHtml: dto.type === 'ARTICLE' ? cleanHtml(dto.contentHtml) : null,
      duration: dto.type === 'ARTICLE' ? 0 : dto.duration,
      isTrial: dto.isTrial,
      // 图文没有时长概念，试看即整节免费
      trialSeconds: dto.isTrial && dto.type !== 'ARTICLE' ? dto.trialSeconds : 0,
    };
  }

  private async mustChapter(id: string) {
    const chapter = await this.prisma.chapter.findUnique({ where: { id } });
    if (!chapter) throw new NotFoundException('章节不存在');
    return chapter;
  }

  private assertSameSet(existing: string[], ids: string[]) {
    const set = new Set(existing);
    if (ids.length !== existing.length || ids.some((id) => !set.has(id))) {
      throw new BizException(ErrorCode.BAD_REQUEST, '排序数据已过期，请刷新后重试');
    }
  }
}
