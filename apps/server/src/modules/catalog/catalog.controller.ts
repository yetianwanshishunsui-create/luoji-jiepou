import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsString } from 'class-validator';
import type { IdentityType } from '@luoji/shared';
import { CurrentUser, type UserTokenPayload } from '../../common/decorators/current-user.decorator';
import { RequireCert } from '../../common/decorators/require-cert.decorator';
import { PageQueryDto } from '../../common/dto/page.dto';
import { CertGuard } from '../../common/guards/cert.guard';
import { UserAuthGuard } from '../../common/guards/user-auth.guard';
import { CatalogService } from './catalog.service';

class ProductQueryDto extends PageQueryDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @Type(() => String)
  @IsIn(['COURSE', 'COLUMN', 'SERIES', 'OFFLINE'])
  type?: 'COURSE' | 'COLUMN' | 'SERIES' | 'OFFLINE';
}

type CertedRequest = { identityType: IdentityType };

/** 课程内容：全部需要认证通过（认证准入） */
@ApiTags('小程序 · 课程')
@ApiBearerAuth()
@RequireCert()
@UseGuards(UserAuthGuard, CertGuard)
@Controller('api/v1')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('home')
  home(@Req() req: CertedRequest) {
    return this.catalog.home(req.identityType);
  }

  @Get('categories')
  categories(@Req() req: CertedRequest) {
    return this.catalog.categories(req.identityType);
  }

  @Get('products')
  products(@Req() req: CertedRequest, @Query() q: ProductQueryDto) {
    return this.catalog.list(req.identityType, q);
  }

  @Get('products/:id')
  detail(@Req() req: CertedRequest, @CurrentUser() user: UserTokenPayload, @Param('id') id: string) {
    return this.catalog.detail(req.identityType, user.sub, id);
  }
}
