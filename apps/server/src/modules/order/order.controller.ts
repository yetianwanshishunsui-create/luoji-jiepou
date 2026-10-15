import { Body, Controller, Get, HttpCode, NotImplementedException, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import type { IdentityType } from '@luoji/shared';
import { CurrentUser, type UserTokenPayload } from '../../common/decorators/current-user.decorator';
import { RequireCert } from '../../common/decorators/require-cert.decorator';
import { SkipTransform } from '../../common/decorators/skip-transform.decorator';
import { PageQueryDto } from '../../common/dto/page.dto';
import { CertGuard } from '../../common/guards/cert.guard';
import { UserAuthGuard } from '../../common/guards/user-auth.guard';
import { OrderService } from './order.service';

class CreateOrderDto {
  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  userCouponId?: string;
}

@ApiTags('小程序 · 订单')
@ApiBearerAuth()
@RequireCert()
@UseGuards(UserAuthGuard, CertGuard)
@Controller('api/v1/orders')
export class OrderController {
  constructor(private readonly orders: OrderService) {}

  @Post()
  create(@CurrentUser() user: UserTokenPayload, @Req() req: { identityType: IdentityType }, @Body() dto: CreateOrderDto) {
    return this.orders.create(user.sub, req.identityType, dto.productId, dto.userCouponId);
  }

  /** 结算预览：价格与可用优惠券 */
  @Get('preview')
  preview(@CurrentUser() user: UserTokenPayload, @Req() req: { identityType: IdentityType }, @Query('productId') productId: string) {
    return this.orders.preview(user.sub, req.identityType, productId);
  }

  @Get()
  list(@CurrentUser() user: UserTokenPayload, @Query() q: PageQueryDto) {
    return this.orders.listMine(user.sub, q.page, q.pageSize);
  }

  @Post(':orderNo/cancel')
  @HttpCode(200)
  cancel(@CurrentUser() user: UserTokenPayload, @Param('orderNo') orderNo: string) {
    return this.orders.cancel(user.sub, orderNo);
  }

  /** 获取小程序支付参数（模拟网关下返回 { mock: true }，订单已直接支付成功） */
  @Post(':orderNo/pay')
  @HttpCode(200)
  pay(@CurrentUser() user: UserTokenPayload, @Param('orderNo') orderNo: string) {
    return this.orders.pay(user.sub, orderNo);
  }
}

@ApiTags('支付回调')
@Controller('api/v1/pay')
export class PayNotifyController {
  constructor(private readonly orders: OrderService) {}

  /**
   * 微信支付 V3 回调。
   * TODO(WP06)：校验 Wechatpay-Signature（平台证书）→ AEAD_AES_256_GCM 解密 resource →
   *            orders.markPaid(out_trade_no, transaction_id, amount.payer_total) → 返回 204。
   */
  @Post('wx-notify')
  @SkipTransform()
  notify() {
    throw new NotImplementedException('微信支付回调待接入（WP06）');
  }
}
