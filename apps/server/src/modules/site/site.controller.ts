import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  ABOUT_PAGE_KEY,
  CONSULT_KEY,
  DEFAULT_ABOUT_PAGE,
  DEFAULT_CONSULT,
  DEFAULT_JOIN_PAGE,
  JOIN_PAGE_KEY,
  type AboutPageConfig,
  type ConsultConfig,
  type JoinPageConfig,
} from '@luoji/shared';
import { SiteConfigService } from './site-config.service';

/** 公开的运营内容（合作页、关于我们、课程顾问，无需登录和认证） */
@ApiTags('小程序 · 运营内容')
@Controller('api/v1/site')
export class SiteController {
  constructor(private readonly site: SiteConfigService) {}

  @Get('join')
  join() {
    return this.site.get<JoinPageConfig>(JOIN_PAGE_KEY, DEFAULT_JOIN_PAGE);
  }

  @Get('about')
  about() {
    return this.site.get<AboutPageConfig>(ABOUT_PAGE_KEY, DEFAULT_ABOUT_PAGE);
  }

  @Get('consult')
  consult() {
    return this.site.get<ConsultConfig>(CONSULT_KEY, DEFAULT_CONSULT);
  }
}
