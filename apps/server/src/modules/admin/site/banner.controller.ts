import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { AdminRole, BannerPosition, ErrorCode, IdentityType, linkProblem } from '@luoji/shared';
import type { Prisma } from '@prisma/client';
import { CurrentAdmin, type AdminTokenPayload } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { BizException } from '../../../common/exceptions/biz.exception';
import { AdminAuthGuard } from '../../../common/guards/admin-auth.guard';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../audit.service';

class BannerQueryDto {
  @IsOptional()
  @IsIn(Object.values(BannerPosition))
  position?: BannerPosition;
}

class BannerDto {
  @IsIn(Object.values(BannerPosition))
  position: BannerPosition;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: '请填写标题' })
  @MaxLength(64)
  title: string;

  @IsUrl({ protocols: ['https', 'http'], require_protocol: true, require_tld: false }, { message: '图片需为 http(s) 链接' })
  @MaxLength(512)
  image: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  link?: string | null;

  /** 为空表示两类身份都展示 */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsIn(Object.values(IdentityType))
  identityType?: IdentityType | null;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  sort: number;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsDateString()
  onlineAt?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsDateString()
  offlineAt?: string | null;

  @IsBoolean()
  enabled: boolean;
}

@ApiTags('后台 · 运营配置 · Banner')
@ApiBearerAuth()
@Roles(AdminRole.OPERATOR)
@UseGuards(AdminAuthGuard)
@Controller('admin/v1/site/banners')
export class AdminBannerController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  list(@Query() q: BannerQueryDto) {
    return this.prisma.banner.findMany({
      where: q.position ? { position: q.position } : {},
      orderBy: [{ position: 'asc' }, { sort: 'asc' }, { createdAt: 'desc' }],
    });
  }

  @Post()
  async create(@Body() dto: BannerDto, @CurrentAdmin() admin: AdminTokenPayload) {
    const banner = await this.prisma.banner.create({ data: this.toData(dto) });
    await this.audit.log(admin.sub, 'BANNER_CREATE', banner.id, { title: banner.title });
    return banner;
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: BannerDto, @CurrentAdmin() admin: AdminTokenPayload) {
    const exists = await this.prisma.banner.count({ where: { id } });
    if (!exists) throw new NotFoundException('Banner 不存在');
    const banner = await this.prisma.banner.update({ where: { id }, data: this.toData(dto) });
    await this.audit.log(admin.sub, 'BANNER_UPDATE', id, { title: banner.title });
    return banner;
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentAdmin() admin: AdminTokenPayload) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException('Banner 不存在');
    await this.prisma.banner.delete({ where: { id } });
    await this.audit.log(admin.sub, 'BANNER_DELETE', id, { title: banner.title });
    return true;
  }

  private toData(dto: BannerDto): Prisma.BannerCreateInput {
    const problem = linkProblem(dto.link);
    if (problem) throw new BizException(ErrorCode.BAD_REQUEST, `跳转链接无效：${problem}`);
    const onlineAt = dto.onlineAt ? new Date(dto.onlineAt) : null;
    const offlineAt = dto.offlineAt ? new Date(dto.offlineAt) : null;
    if (onlineAt && offlineAt && offlineAt <= onlineAt) throw new BizException(ErrorCode.BAD_REQUEST, '下线时间必须晚于上线时间');
    return {
      position: dto.position,
      title: dto.title,
      image: dto.image,
      link: dto.link || null,
      identityType: dto.identityType ?? null,
      sort: dto.sort,
      onlineAt,
      offlineAt,
      enabled: dto.enabled,
    };
  }
}
