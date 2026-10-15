import { Body, Controller, Get, NotFoundException, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { AdminRole, CertStatus, LeadStatus } from '@luoji/shared';
import { CurrentAdmin, type AdminTokenPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PageQueryDto } from '../../common/dto/page.dto';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

class LeadQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(Object.values(LeadStatus))
  status?: LeadStatus;
}

class UpdateLeadDto {
  @IsOptional()
  @IsIn(Object.values(LeadStatus))
  status?: LeadStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;
}

class UserQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(Object.values(CertStatus))
  certStatus?: CertStatus;
}

@ApiTags('后台 · 工作台')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard)
@Controller('admin/v1/dashboard')
export class AdminDashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async summary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [pendingCerts, todayOrders, todayPaidCent, todayLeads] = await Promise.all([
      this.prisma.certification.count({ where: { status: 'PENDING' } }),
      this.prisma.order.count({ where: { status: 'PAID', paidAt: { gte: today } } }),
      this.prisma.order.aggregate({ where: { status: 'PAID', paidAt: { gte: today } }, _sum: { payCent: true } }),
      this.prisma.lead.count({ where: { createdAt: { gte: today } } }),
    ]);
    return { pendingCerts, todayOrders, todayPaidCent: todayPaidCent._sum.payCent ?? 0, todayLeads };
  }
}

@ApiTags('后台 · 招商线索')
@ApiBearerAuth()
@Roles(AdminRole.OPERATOR)
@UseGuards(AdminAuthGuard)
@Controller('admin/v1/leads')
export class AdminLeadController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query() q: LeadQueryDto) {
    const where = q.status ? { status: q.status } : {};
    const [list, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: q.skip,
        take: q.pageSize,
        omit: { phoneEnc: true, phoneHash: true },
      }),
      this.prisma.lead.count({ where }),
    ]);
    return { list, total, page: q.page, pageSize: q.pageSize };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateLeadDto, @CurrentAdmin() admin: AdminTokenPayload) {
    const exists = await this.prisma.lead.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('线索不存在');
    const [lead] = await this.prisma.$transaction([
      this.prisma.lead.update({ where: { id }, data: dto, omit: { phoneEnc: true, phoneHash: true } }),
      this.prisma.auditLog.create({ data: { adminId: admin.sub, action: 'LEAD_UPDATE', target: id, detail: { ...dto } } }),
    ]);
    return lead;
  }
  // TODO(WP08)：导出 Excel（解密手机号需单独权限并记审计）
}

@ApiTags('后台 · 用户')
@ApiBearerAuth()
@Roles(AdminRole.OPERATOR, AdminRole.REVIEWER)
@UseGuards(AdminAuthGuard)
@Controller('admin/v1/users')
export class AdminUserController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query() q: UserQueryDto) {
    const where = q.certStatus ? { certStatus: q.certStatus } : {};
    const [list, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: q.skip,
        take: q.pageSize,
        select: {
          id: true,
          nickname: true,
          avatar: true,
          phoneMasked: true,
          identityType: true,
          certStatus: true,
          disabled: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { list, total, page: q.page, pageSize: q.pageSize };
  }
}
