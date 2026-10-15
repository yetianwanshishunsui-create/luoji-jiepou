import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DEFAULT_JOIN_PAGE, JOIN_PAGE_KEY, type JoinPageConfig } from '@luoji/shared';
import { SiteConfigService } from './site-config.service';

/** 公开的运营内容（招商页无需登录和认证） */
@ApiTags('小程序 · 运营内容')
@Controller('api/v1/site')
export class SiteController {
  constructor(private readonly site: SiteConfigService) {}

  @Get('join')
  join() {
    return this.site.get<JoinPageConfig>(JOIN_PAGE_KEY, DEFAULT_JOIN_PAGE);
  }
}
