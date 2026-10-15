import { Body, Controller, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Transform } from 'class-transformer';
import { IsMobilePhone, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import type { IdentityType } from '@luoji/shared';
import { CurrentUser, type UserTokenPayload } from '../../common/decorators/current-user.decorator';
import { RequireCert } from '../../common/decorators/require-cert.decorator';
import { CertGuard } from '../../common/guards/cert.guard';
import { UserAuthGuard } from '../../common/guards/user-auth.guard';
import { OfflineService } from './offline.service';

class EnrollDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: '请填写联系人' })
  @MaxLength(32)
  name: string;

  @IsMobilePhone('zh-CN', {}, { message: '手机号格式不正确' })
  phone: string;
}

@ApiTags('小程序 · 线下课报名')
@ApiBearerAuth()
@RequireCert()
@UseGuards(UserAuthGuard, CertGuard)
@Controller('api/v1/offline')
export class OfflineController {
  constructor(private readonly offline: OfflineService) {}

  @Get('products/:productId/sessions')
  sessions(@CurrentUser() user: UserTokenPayload, @Req() req: { identityType: IdentityType }, @Param('productId') productId: string) {
    return this.offline.sessions(user.sub, req.identityType, productId);
  }

  @Post('sessions/:sessionId/enroll')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  enroll(
    @CurrentUser() user: UserTokenPayload,
    @Req() req: { identityType: IdentityType },
    @Param('sessionId') sessionId: string,
    @Body() dto: EnrollDto,
  ) {
    return this.offline.enroll(user.sub, req.identityType, sessionId, dto);
  }

  @Post('enrollments/:id/balance')
  @HttpCode(200)
  payBalance(@CurrentUser() user: UserTokenPayload, @Param('id') id: string) {
    return this.offline.payBalance(user.sub, id);
  }

  @Post('enrollments/:id/cancel')
  @HttpCode(200)
  cancel(@CurrentUser() user: UserTokenPayload, @Param('id') id: string) {
    return this.offline.cancel(user.sub, id);
  }

  @Get('enrollments')
  mine(@CurrentUser() user: UserTokenPayload) {
    return this.offline.mine(user.sub);
  }
}
