import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { AdminRole, CertStatus } from '@luoji/shared';
import { CurrentAdmin, type AdminTokenPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PageQueryDto } from '../../common/dto/page.dto';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { ReviewCertDto } from '../cert/cert.dto';
import { CertService } from '../cert/cert.service';

class CertQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(Object.values(CertStatus))
  status?: CertStatus;
}

@ApiTags('后台 · 认证审核')
@ApiBearerAuth()
@Roles(AdminRole.REVIEWER)
@UseGuards(AdminAuthGuard)
@Controller('admin/v1/certifications')
export class AdminCertController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cert: CertService,
  ) {}

  @Get()
  async list(@Query() q: CertQueryDto) {
    const where = q.status ? { status: q.status } : {};
    const [list, total] = await Promise.all([
      this.prisma.certification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: q.skip,
        take: q.pageSize,
        // 列表不返回姓名 / 证号明文，查看详情时解密并记审计日志
        select: {
          id: true,
          identityType: true,
          organization: true,
          status: true,
          rejectReason: true,
          createdAt: true,
          reviewedAt: true,
          user: { select: { id: true, nickname: true, phoneMasked: true } },
          reviewer: { select: { name: true } },
        },
      }),
      this.prisma.certification.count({ where }),
    ]);
    return { list, total, page: q.page, pageSize: q.pageSize };
  }

  @Get(':id')
  detail(@Param('id') id: string, @CurrentAdmin() admin: AdminTokenPayload) {
    return this.cert.detailForAdmin(id, admin.sub);
  }

  @Post(':id/review')
  review(@Param('id') id: string, @CurrentAdmin() admin: AdminTokenPayload, @Body() dto: ReviewCertDto) {
    return this.cert.review(id, admin.sub, dto);
  }
}
