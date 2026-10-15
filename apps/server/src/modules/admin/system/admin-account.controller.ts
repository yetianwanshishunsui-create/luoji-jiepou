import { Body, Controller, Get, NotFoundException, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { AdminRole, ErrorCode } from '@luoji/shared';
import * as bcrypt from 'bcryptjs';
import { CurrentAdmin, type AdminTokenPayload } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { BizException } from '../../../common/exceptions/biz.exception';
import { AdminAuthGuard } from '../../../common/guards/admin-auth.guard';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../audit.service';
import { losesLastSuperAdmin, passwordProblem } from './account.rules';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

class UpdateAdminDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: '请填写姓名' })
  @MaxLength(32)
  name: string;

  @IsIn(Object.values(AdminRole))
  role: AdminRole;
}

class CreateAdminDto extends UpdateAdminDto {
  @Transform(trim)
  @Matches(/^[a-zA-Z][a-zA-Z0-9_]{3,31}$/, { message: '用户名为 4~32 位字母、数字或下划线，以字母开头' })
  username: string;

  @IsString()
  @MaxLength(64)
  password: string;
}

class DisabledDto {
  @IsBoolean()
  disabled: boolean;
}

class ResetPasswordDto {
  @IsString()
  @MaxLength(64)
  password: string;
}

const SELECT = { id: true, username: true, name: true, role: true, disabled: true, lastLoginAt: true, createdAt: true } as const;

/** 管理员账号（仅超级管理员）。有操作记录的账号只停用不删除，保证审计可追溯。 */
@ApiTags('后台 · 系统 · 管理员')
@ApiBearerAuth()
@Roles(AdminRole.SUPER_ADMIN)
@UseGuards(AdminAuthGuard)
@Controller('admin/v1/system/admins')
export class AdminAccountController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  list() {
    return this.prisma.adminUser.findMany({ orderBy: [{ disabled: 'asc' }, { createdAt: 'asc' }], select: SELECT });
  }

  @Post()
  async create(@Body() dto: CreateAdminDto, @CurrentAdmin() me: AdminTokenPayload) {
    const problem = passwordProblem(dto.password, dto.username);
    if (problem) throw new BizException(ErrorCode.BAD_REQUEST, problem);
    const exists = await this.prisma.adminUser.count({ where: { username: dto.username } });
    if (exists) throw new BizException(ErrorCode.BAD_REQUEST, '用户名已存在');

    const admin = await this.prisma.adminUser.create({
      data: { username: dto.username, name: dto.name, role: dto.role, passwordHash: await bcrypt.hash(dto.password, 10) },
      select: SELECT,
    });
    await this.audit.log(me.sub, 'ADMIN_CREATE', admin.id, { username: admin.username, role: admin.role });
    return admin;
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateAdminDto, @CurrentAdmin() me: AdminTokenPayload) {
    const target = await this.mustFind(id);
    if (id === me.sub && dto.role !== target.role) throw new BizException(ErrorCode.BAD_REQUEST, '不能修改自己的角色');
    await this.assertKeepsSuperAdmin(target, { role: dto.role, disabled: target.disabled });

    const roleChanged = dto.role !== target.role;
    const admin = await this.prisma.adminUser.update({
      where: { id },
      // 角色变化使旧 token 失效，按新权限重新登录
      data: { name: dto.name, role: dto.role, ...(roleChanged && { tokenVersion: { increment: 1 } }) },
      select: SELECT,
    });
    await this.audit.log(me.sub, 'ADMIN_UPDATE', id, { name: dto.name, ...(roleChanged && { role: `${target.role} → ${dto.role}` }) });
    return admin;
  }

  @Patch(':id/disabled')
  async setDisabled(@Param('id') id: string, @Body() dto: DisabledDto, @CurrentAdmin() me: AdminTokenPayload) {
    const target = await this.mustFind(id);
    if (id === me.sub) throw new BizException(ErrorCode.BAD_REQUEST, '不能停用自己的账号');
    await this.assertKeepsSuperAdmin(target, { role: target.role, disabled: dto.disabled });

    const admin = await this.prisma.adminUser.update({
      where: { id },
      data: { disabled: dto.disabled, tokenVersion: { increment: 1 } },
      select: SELECT,
    });
    await this.audit.log(me.sub, dto.disabled ? 'ADMIN_DISABLE' : 'ADMIN_ENABLE', id, { username: target.username });
    return admin;
  }

  /** 重置他人密码；该账号所有登录态立即失效 */
  @Post(':id/reset-password')
  async resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto, @CurrentAdmin() me: AdminTokenPayload) {
    const target = await this.mustFind(id);
    if (id === me.sub) throw new BizException(ErrorCode.BAD_REQUEST, '修改自己的密码请使用右上角“修改密码”');
    const problem = passwordProblem(dto.password, target.username);
    if (problem) throw new BizException(ErrorCode.BAD_REQUEST, problem);

    await this.prisma.adminUser.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(dto.password, 10), tokenVersion: { increment: 1 } },
    });
    await this.audit.log(me.sub, 'ADMIN_RESET_PASSWORD', id, { username: target.username });
    return true;
  }

  private async mustFind(id: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!admin) throw new NotFoundException('管理员不存在');
    return admin;
  }

  private async assertKeepsSuperAdmin(target: { role: string; disabled: boolean }, next: { role: string; disabled: boolean }) {
    const activeSupers = await this.prisma.adminUser.count({ where: { role: 'SUPER_ADMIN', disabled: false } });
    if (losesLastSuperAdmin(target, next, activeSupers)) {
      throw new BizException(ErrorCode.BAD_REQUEST, '至少需要保留一个启用中的超级管理员');
    }
  }
}
