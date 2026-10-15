import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Ip, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ErrorCode } from '@luoji/shared';
import * as bcrypt from 'bcryptjs';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import type Redis from 'ioredis';
import type { AppConfig } from '../../config/configuration';
import { CurrentAdmin, type AdminTokenPayload } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { BizException } from '../../common/exceptions/biz.exception';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { REDIS } from '../../redis/redis.module';
import { AuditService } from './audit.service';
import { LOGIN_LOCK_SECONDS, LOGIN_MAX_FAILURES, passwordProblem } from './system/account.rules';

class AdminLoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  username: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  password: string;
}

class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: '请输入原密码' })
  @MaxLength(64)
  oldPassword: string;

  @IsString()
  @IsNotEmpty({ message: '请输入新密码' })
  @MaxLength(64)
  newPassword: string;
}

/** 后台 token 有效期（秒） */
const ADMIN_TOKEN_TTL = 8 * 3600;
const failKey = (username: string) => `admin:login-fail:${username.toLowerCase()}`;

@ApiTags('后台 · 登录')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard)
@Controller('admin/v1/auth')
export class AdminAuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly audit: AuditService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  /** 连续失败 5 次锁定 15 分钟（按用户名计数，锁定期内密码正确也拒绝） */
  @Post('login')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(@Body() dto: AdminLoginDto, @Ip() ip: string) {
    const key = failKey(dto.username);
    const failures = Number(await this.redis.get(key)) || 0;
    if (failures >= LOGIN_MAX_FAILURES) {
      const ttl = await this.redis.ttl(key);
      throw new BizException(
        ErrorCode.TOO_MANY_REQUESTS,
        `密码错误次数过多，请 ${Math.max(1, Math.ceil(ttl / 60))} 分钟后再试`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const admin = await this.prisma.adminUser.findUnique({ where: { username: dto.username } });
    const ok = admin && !admin.disabled && (await bcrypt.compare(dto.password, admin.passwordHash));
    if (!ok) {
      const n = await this.redis.incr(key);
      if (n === 1) await this.redis.expire(key, LOGIN_LOCK_SECONDS);
      if (n >= LOGIN_MAX_FAILURES) await this.redis.expire(key, LOGIN_LOCK_SECONDS);
      if (admin) await this.audit.log(admin.id, 'ADMIN_LOGIN_FAIL', undefined, { ip, failures: n });
      const left = LOGIN_MAX_FAILURES - n;
      throw new UnauthorizedException(left > 0 ? `用户名或密码错误，还可尝试 ${left} 次` : '密码错误次数过多，账号已锁定 15 分钟');
    }
    await this.redis.del(key);

    const payload: AdminTokenPayload = { sub: admin.id, role: admin.role, typ: 'admin', ver: admin.tokenVersion };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('jwt', { infer: true }).adminSecret,
      expiresIn: ADMIN_TOKEN_TTL,
    });
    await this.prisma.$transaction([
      this.prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } }),
      this.prisma.auditLog.create({ data: { adminId: admin.id, action: 'ADMIN_LOGIN', ip } }),
    ]);
    return { accessToken, expiresIn: ADMIN_TOKEN_TTL, admin: { id: admin.id, name: admin.name, role: admin.role } };
  }

  @Get('me')
  async me(@CurrentAdmin() current: AdminTokenPayload) {
    return this.prisma.adminUser.findUniqueOrThrow({
      where: { id: current.sub },
      select: { id: true, username: true, name: true, role: true },
    });
  }

  /** 修改自己的密码；成功后所有登录态失效，需重新登录 */
  @Post('password')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async changePassword(@CurrentAdmin() current: AdminTokenPayload, @Body() dto: ChangePasswordDto, @Ip() ip: string) {
    const admin = await this.prisma.adminUser.findUniqueOrThrow({ where: { id: current.sub } });
    if (!(await bcrypt.compare(dto.oldPassword, admin.passwordHash))) {
      throw new BizException(ErrorCode.BAD_REQUEST, '原密码不正确');
    }
    if (dto.oldPassword === dto.newPassword) throw new BizException(ErrorCode.BAD_REQUEST, '新密码不能与原密码相同');
    const problem = passwordProblem(dto.newPassword, admin.username);
    if (problem) throw new BizException(ErrorCode.BAD_REQUEST, problem);

    await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: { passwordHash: await bcrypt.hash(dto.newPassword, 10), tokenVersion: { increment: 1 } },
    });
    await this.audit.log(admin.id, 'ADMIN_PASSWORD_CHANGE', admin.id, { ip });
    return true;
  }
}
