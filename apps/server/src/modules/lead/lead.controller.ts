import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsMobilePhone, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser, type UserTokenPayload } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CryptoService } from '../../common/crypto/crypto.service';
import { UserAuthGuard } from '../../common/guards/user-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

class CreateLeadDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  name: string;

  @IsMobilePhone('zh-CN', {}, { message: '手机号格式不正确' })
  phone: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  organization?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  intention?: string;

  @IsOptional()
  @IsObject()
  extra?: Record<string, unknown>;
}

/** 从业者招商留资：无需认证，登录可选 */
@ApiTags('小程序 · 招商')
@UseGuards(UserAuthGuard)
@Controller('api/v1/leads')
export class LeadController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  @Post()
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async create(@Body() dto: CreateLeadDto, @CurrentUser() user?: UserTokenPayload) {
    const { phone, ...rest } = dto;
    const lead = await this.prisma.lead.create({
      data: {
        ...rest,
        extra: rest.extra as object | undefined,
        openid: user?.openid,
        phoneEnc: this.crypto.encrypt(phone),
        phoneHash: this.crypto.hash(phone),
        phoneMasked: CryptoService.maskPhone(phone),
      },
      select: { id: true, createdAt: true },
    });
    // TODO(WP08)：推送企业微信 / 飞书机器人通知运营
    return lead;
  }
}
