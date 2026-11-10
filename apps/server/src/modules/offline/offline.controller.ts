import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Transform } from 'class-transformer';
import { IsISO8601, IsMobilePhone, IsNotEmpty, IsString, MaxLength } from 'class-validator';
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

class ScheduleQueryDto {
  @IsISO8601({}, { message: '开始日期格式不正确' })
  from: string;

  @IsISO8601({}, { message: '结束日期格式不正确' })
  to: string;
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

  /** 线下会议日程（平台排期） */
  @Get('schedule')
  schedule(@CurrentUser() user: UserTokenPayload, @Req() req: { identityType: IdentityType }, @Query() q: ScheduleQueryDto) {
    return this.offline.schedule(user.sub, req.identityType, new Date(q.from), new Date(q.to));
  }

  /** 我的计划（含已报名场次） */
  @Get('plans')
  plans(@CurrentUser() user: UserTokenPayload, @Req() req: { identityType: IdentityType }) {
    return this.offline.plans(user.sub, req.identityType);
  }

  @Put('plans/:sessionId')
  addPlan(@CurrentUser() user: UserTokenPayload, @Req() req: { identityType: IdentityType }, @Param('sessionId') sessionId: string) {
    return this.offline.addPlan(user.sub, req.identityType, sessionId);
  }

  @Delete('plans/:sessionId')
  removePlan(@CurrentUser() user: UserTokenPayload, @Param('sessionId') sessionId: string) {
    return this.offline.removePlan(user.sub, sessionId);
  }
}
