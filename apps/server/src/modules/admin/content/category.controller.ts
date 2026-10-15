import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminRole, ErrorCode } from '@luoji/shared';
import { CurrentAdmin, type AdminTokenPayload } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { BizException } from '../../../common/exceptions/biz.exception';
import { AdminAuthGuard } from '../../../common/guards/admin-auth.guard';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../audit.service';
import { CategoryDto } from './content.dto';

/** 二级分类管理：一级分类下挂二级分类，不允许更深层级 */
@ApiTags('后台 · 内容 · 分类')
@ApiBearerAuth()
@Roles(AdminRole.OPERATOR)
@UseGuards(AdminAuthGuard)
@Controller('admin/v1/content/categories')
export class AdminCategoryController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async tree() {
    const all = await this.prisma.category.findMany({
      orderBy: [{ sort: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } } },
    });
    const node = ({ _count, ...c }: (typeof all)[number]) => ({ ...c, productCount: _count.products });
    return all
      .filter((c) => !c.parentId)
      .map((root) => ({ ...node(root), children: all.filter((c) => c.parentId === root.id).map(node) }));
  }

  @Post()
  async create(@Body() dto: CategoryDto, @CurrentAdmin() admin: AdminTokenPayload) {
    await this.assertParent(dto.parentId);
    const category = await this.prisma.category.create({
      data: { name: dto.name, parentId: dto.parentId || null, sort: dto.sort ?? 0, enabled: dto.enabled ?? true, visibleTo: dto.visibleTo },
    });
    await this.audit.log(admin.sub, 'CATEGORY_CREATE', category.id, { name: dto.name });
    return category;
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: CategoryDto, @CurrentAdmin() admin: AdminTokenPayload) {
    const current = await this.prisma.category.findUnique({ where: { id }, include: { _count: { select: { children: true } } } });
    if (!current) throw new NotFoundException('分类不存在');

    const parentId = dto.parentId || null;
    if (parentId) {
      if (parentId === id) throw new BizException(ErrorCode.BAD_REQUEST, '不能把分类设为自己的子分类');
      if (current._count.children > 0) throw new BizException(ErrorCode.BAD_REQUEST, '该分类下有二级分类，不能再挂到其他分类下');
      await this.assertParent(parentId);
    }

    const category = await this.prisma.category.update({
      where: { id },
      data: { name: dto.name, parentId, sort: dto.sort ?? current.sort, enabled: dto.enabled ?? current.enabled, visibleTo: dto.visibleTo },
    });
    await this.audit.log(admin.sub, 'CATEGORY_UPDATE', id, { name: dto.name });
    return category;
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentAdmin() admin: AdminTokenPayload) {
    const current = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { children: true, products: true } } },
    });
    if (!current) throw new NotFoundException('分类不存在');
    if (current._count.children > 0) throw new BizException(ErrorCode.BAD_REQUEST, '请先删除该分类下的二级分类');
    if (current._count.products > 0) {
      throw new BizException(ErrorCode.BAD_REQUEST, `该分类下还有 ${current._count.products} 个课程，请先移到其他分类`);
    }
    await this.prisma.category.delete({ where: { id } });
    await this.audit.log(admin.sub, 'CATEGORY_DELETE', id, { name: current.name });
    return true;
  }

  /** 父分类必须存在且本身是一级分类 */
  private async assertParent(parentId?: string | null) {
    if (!parentId) return;
    const parent = await this.prisma.category.findUnique({ where: { id: parentId }, select: { parentId: true } });
    if (!parent) throw new BizException(ErrorCode.BAD_REQUEST, '上级分类不存在');
    if (parent.parentId) throw new BizException(ErrorCode.BAD_REQUEST, '最多支持两级分类');
  }
}
