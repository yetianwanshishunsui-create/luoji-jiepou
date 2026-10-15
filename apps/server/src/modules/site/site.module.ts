import { Global, Module } from '@nestjs/common';
import { SiteConfigService } from './site-config.service';
import { SiteController } from './site.controller';

@Global()
@Module({
  controllers: [SiteController],
  providers: [SiteConfigService],
  exports: [SiteConfigService],
})
export class SiteModule {}
