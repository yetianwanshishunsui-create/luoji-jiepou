import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@luoji/shared';
import { CurrentAdmin, type AdminTokenPayload } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminAuthGuard } from '../../../common/guards/admin-auth.guard';
import {
  CreateProductDto,
  OfflineSessionDto,
  ProductItemsDto,
  ProductQueryDto,
  ProductStatusDto,
  UpdateProductDto,
} from './content.dto';
import { AdminProductService } from './product.service';

@ApiTags('后台 · 内容 · 课程')
@ApiBearerAuth()
@Roles(AdminRole.OPERATOR)
@UseGuards(AdminAuthGuard)
@Controller('admin/v1/content')
export class AdminProductController {
  constructor(private readonly products: AdminProductService) {}

  @Get('products')
  list(@Query() q: ProductQueryDto) {
    return this.products.list(q);
  }

  @Get('products/:id')
  detail(@Param('id') id: string) {
    return this.products.detail(id);
  }

  @Post('products')
  create(@Body() dto: CreateProductDto, @CurrentAdmin() admin: AdminTokenPayload) {
    return this.products.create(dto, admin.sub);
  }

  @Put('products/:id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto, @CurrentAdmin() admin: AdminTokenPayload) {
    return this.products.update(id, dto, admin.sub);
  }

  @Patch('products/:id/status')
  setStatus(@Param('id') id: string, @Body() dto: ProductStatusDto, @CurrentAdmin() admin: AdminTokenPayload) {
    return this.products.setStatus(id, dto.status, admin.sub);
  }

  @Delete('products/:id')
  remove(@Param('id') id: string, @CurrentAdmin() admin: AdminTokenPayload) {
    return this.products.remove(id, admin.sub);
  }

  @Put('products/:id/items')
  setItems(@Param('id') id: string, @Body() dto: ProductItemsDto, @CurrentAdmin() admin: AdminTokenPayload) {
    return this.products.setItems(id, dto.childProductIds, admin.sub);
  }

  @Post('products/:id/sessions')
  createSession(@Param('id') id: string, @Body() dto: OfflineSessionDto, @CurrentAdmin() admin: AdminTokenPayload) {
    return this.products.createSession(id, dto, admin.sub);
  }

  @Put('sessions/:sid')
  updateSession(@Param('sid') sid: string, @Body() dto: OfflineSessionDto, @CurrentAdmin() admin: AdminTokenPayload) {
    return this.products.updateSession(sid, dto, admin.sub);
  }

  @Delete('sessions/:sid')
  removeSession(@Param('sid') sid: string, @CurrentAdmin() admin: AdminTokenPayload) {
    return this.products.removeSession(sid, admin.sub);
  }
}
