import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { BadRequestException, ValidationPipe, type ValidationError } from '@nestjs/common';
import configuration, { validateEnv } from './config/configuration';
import { CryptoModule } from './common/crypto/crypto.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { PayModule } from './integrations/pay/pay.module';
import { WechatModule } from './integrations/wechat/wechat.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { CertModule } from './modules/cert/cert.module';
import { HealthModule } from './modules/health/health.module';
import { LeadModule } from './modules/lead/lead.module';
import { LearningModule } from './modules/learning/learning.module';
import { MarketingModule } from './modules/marketing/marketing.module';
import { OfflineModule } from './modules/offline/offline.module';
import { OrderModule } from './modules/order/order.module';
import { SiteModule } from './modules/site/site.module';
import { UserModule } from './modules/user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';

function flattenValidationErrors(errors: ValidationError[], out: string[] = []): string[] {
  for (const e of errors) {
    if (e.constraints) out.push(...Object.values(e.constraints));
    if (e.children?.length) flattenValidationErrors(e.children, out);
  }
  return out;
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], validate: validateEnv }),
    // 密钥按用户端 / 后台分别在签发和校验时传入
    JwtModule.register({ global: true }),
    // TODO：多实例部署时改用 Redis 存储
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    CryptoModule,
    WechatModule,
    PayModule,
    HealthModule,
    AuthModule,
    UserModule,
    CertModule,
    CatalogModule,
    LearningModule,
    OrderModule,
    MarketingModule,
    OfflineModule,
    SiteModule,
    LeadModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        // 只返回提示文案，去掉嵌套字段路径前缀（如 sections.0.）
        exceptionFactory: (errors) => new BadRequestException(flattenValidationErrors(errors)),
      }),
    },
  ],
})
export class AppModule {}
