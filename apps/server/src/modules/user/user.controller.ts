import { Body, Controller, Get, NotFoundException, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { CurrentUser, type UserTokenPayload } from '../../common/decorators/current-user.decorator';
import { UserAuthGuard } from '../../common/guards/user-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { toUserProfile } from './user.mapper';

class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  nickname?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(512)
  avatar?: string;
}

@ApiTags('小程序 · 我的')
@ApiBearerAuth()
@UseGuards(UserAuthGuard)
@Controller('api/v1/me')
export class UserController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async me(@CurrentUser() current: UserTokenPayload) {
    const user = await this.prisma.user.findUnique({ where: { id: current.sub } });
    if (!user) throw new NotFoundException('用户不存在');
    return toUserProfile(user);
  }

  /** 小程序 wx.request 不支持 PATCH，用 PUT */
  @Put()
  async update(@CurrentUser() current: UserTokenPayload, @Body() dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({ where: { id: current.sub }, data: dto });
    return toUserProfile(user);
  }
}
