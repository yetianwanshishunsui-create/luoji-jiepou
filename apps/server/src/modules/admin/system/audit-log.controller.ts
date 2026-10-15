import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';
import { AdminRole } from '@luoji/shared';
import type { Prisma } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { PageQueryDto } from '../../../common/dto/page.dto';
import { AdminAuthGuard } from '../../../common/guards/admin-auth.guard';
import { PrismaService } from '../../../prisma/prisma.service';

class AuditQueryDto extends PageQueryDto {
  @IsOptional()
  @IsString()
  adminId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  action?: string;

  /** 操作对象 ID（订单号、课程 ID 等），前缀匹配 */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  target?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

/** 操作日志查询（仅超级管理员） */
@ApiTags('后台 · 系统 · 操作日志')
@ApiBearerAuth()
@Roles(AdminRole.SUPER_ADMIN)
@UseGuards(AdminAuthGuard)
@Controller('admin/v1/system/audit-logs')
export class AuditLogController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query() q: AuditQueryDto) {
    const where: Prisma.AuditLogWhereInput = {
      ...(q.adminId && { adminId: q.adminId }),
      ...(q.action && { action: q.action }),
      ...(q.target && { target: { startsWith: q.target.trim() } }),
      ...((q.from || q.to) && { createdAt: { ...(q.from && { gte: new Date(q.from) }), ...(q.to && { lte: new Date(q.to) }) } }),
    };
    const [list, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: q.skip,
        take: q.pageSize,
        include: { admin: { select: { id: true, name: true, username: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { list, total, page: q.page, pageSize: q.pageSize };
  }

  /** 已出现过的操作类型（筛选下拉） */
  @Get('actions')
  async actions() {
    const rows = await this.prisma.auditLog.groupBy({ by: ['action'], _count: true, orderBy: { action: 'asc' } });
    return rows.map((r) => ({ action: r.action, count: r._count }));
  }
}
