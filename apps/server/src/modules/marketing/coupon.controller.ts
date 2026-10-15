import { Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, type UserTokenPayload } from '../../common/decorators/current-user.decorator';
import { RequireCert } from '../../common/decorators/require-cert.decorator';
import { CertGuard } from '../../common/guards/cert.guard';
import { UserAuthGuard } from '../../common/guards/user-auth.guard';
import { CouponService, type MyCouponTab } from './coupon.service';

@ApiTags('小程序 · 优惠券')
@ApiBearerAuth()
@RequireCert()
@UseGuards(UserAuthGuard, CertGuard)
@Controller('api/v1')
export class CouponController {
  constructor(private readonly coupons: CouponService) {}

  @Get('coupons/center')
  center(@CurrentUser() user: UserTokenPayload) {
    return this.coupons.center(user.sub);
  }

  @Post('coupons/:id/claim')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  claim(@CurrentUser() user: UserTokenPayload, @Param('id') id: string) {
    return this.coupons.claim(user.sub, id);
  }

  @Get('me/coupons')
  mine(@CurrentUser() user: UserTokenPayload, @Query('tab') tab?: string) {
    const t: MyCouponTab = tab === 'used' || tab === 'expired' ? tab : 'usable';
    return this.coupons.mine(user.sub, t);
  }
}
