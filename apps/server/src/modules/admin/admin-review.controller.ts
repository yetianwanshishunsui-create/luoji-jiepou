import { Body, Controller, Get, NotFoundException, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { AdminRole, ReviewStatus } from '@luoji/shared';
import { CurrentAdmin, type AdminTokenPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PageQueryDto } from '../../common/dto/page.dto';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

class ReviewQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(Object.values(ReviewStatus))
  status?: ReviewStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  /** 课程名称关键字 */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(64)
  keyword?: string;
}

class UpdateReviewDto {
  @IsOptional()
  @IsIn(Object.values(ReviewStatus))
  status?: ReviewStatus;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  /** 官方回复，空字符串表示删除回复 */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  reply?: string;
}

/** 课程评价：审核（展示 / 隐藏）、精选、官方回复 */
@ApiTags('后台 · 课程评价')
@ApiBearerAuth()
@Roles(AdminRole.OPERATOR)
@UseGuards(AdminAuthGuard)
@Controller('admin/v1/reviews')
export class AdminReviewController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query() q: ReviewQueryDto) {
    const where = {
      ...(q.status && { status: q.status }),
      ...(q.rating && { rating: q.rating }),
      ...(q.keyword && { product: { title: { contains: q.keyword } } }),
    };
    const [list, total, pending] = await Promise.all([
      this.prisma.productReview.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: q.skip,
        take: q.pageSize,
        include: {
          product: { select: { id: true, title: true } },
          user: { select: { id: true, nickname: true, phoneMasked: true, identityType: true } },
        },
      }),
      this.prisma.productReview.count({ where }),
      this.prisma.productReview.count({ where: { status: 'PENDING' } }),
    ]);
    return { list, total, page: q.page, pageSize: q.pageSize, pending };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateReviewDto, @CurrentAdmin() admin: AdminTokenPayload) {
    const exists = await this.prisma.productReview.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('评价不存在');
    const data = {
      ...(dto.status && { status: dto.status }),
      ...(dto.featured !== undefined && { featured: dto.featured }),
      ...(dto.reply !== undefined && { reply: dto.reply || null, repliedAt: dto.reply ? new Date() : null }),
    };
    const [review] = await this.prisma.$transaction([
      this.prisma.productReview.update({ where: { id }, data }),
      this.prisma.auditLog.create({ data: { adminId: admin.sub, action: 'REVIEW_UPDATE', target: id, detail: { ...dto } } }),
    ]);
    return review;
  }
}
