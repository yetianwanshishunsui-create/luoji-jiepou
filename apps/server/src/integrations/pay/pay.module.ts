import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../config/configuration';
import { MockPayGateway } from './mock-pay.gateway';
import { PAY_GATEWAY } from './pay-gateway';
import { WxPayGateway } from './wxpay.gateway';

@Global()
@Module({
  providers: [
    {
      provide: PAY_GATEWAY,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        if (config.get('pay', { infer: true }).mock) {
          new Logger('Pay').warn('PAY_MOCK=true：支付与退款使用模拟网关，仅限开发环境');
          return new MockPayGateway();
        }
        return new WxPayGateway();
      },
    },
  ],
  exports: [PAY_GATEWAY],
})
export class PayModule {}
