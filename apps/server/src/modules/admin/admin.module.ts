import { AdminReviewController } from './admin-review.controller';
import { Module } from '@nestjs/common';
import { CertModule } from '../cert/cert.module';
import { OrderModule } from '../order/order.module';
import { AdminAuthController } from './admin-auth.controller';
import { AdminCertController } from './admin-cert.controller';
import { AdminEnrollmentController } from './admin-enrollment.controller';
import { AdminOrderController } from './admin-order.controller';
import { AdminCouponController } from './marketing/coupon.controller';
import { AdminPriceRuleController } from './marketing/price-rule.controller';
import { AdminBannerController } from './site/banner.controller';
import { AdminSiteConfigController } from './site/site-config.controller';
import { AdminAccountController } from './system/admin-account.controller';
import { AuditLogController } from './system/audit-log.controller';
import { AdminDashboardController, AdminLeadController, AdminUserController } from './admin-misc.controller';
import { AuditService } from './audit.service';
import { AdminCategoryController } from './content/category.controller';
import { AdminCurriculumController } from './content/curriculum.controller';
import { AdminDailyAudioController } from './content/daily-audio.controller';
import { AdminProductController } from './content/product.controller';
import { AdminProductService } from './content/product.service';

/**
 * 管理后台接口（/admin/v1）：content/ 内容、marketing/ 营销、site/ 运营配置、system/ 系统管理。
 */
@Module({
  imports: [CertModule, OrderModule],
  controllers: [
    AdminAuthController,
    AdminCertController,
    AdminDashboardController,
    AdminLeadController,
    AdminReviewController,
    AdminUserController,
    AdminCategoryController,
    AdminProductController,
    AdminCurriculumController,
    AdminDailyAudioController,
    AdminOrderController,
    AdminEnrollmentController,
    AdminPriceRuleController,
    AdminCouponController,
    AdminBannerController,
    AdminSiteConfigController,
    AdminAccountController,
    AuditLogController,
  ],
  providers: [AuditService, AdminProductService],
})
export class AdminModule {}
