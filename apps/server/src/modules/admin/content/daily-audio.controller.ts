import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@luoji/shared';
import { CurrentAdmin, type AdminTokenPayload } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminAuthGuard } from '../../../common/guards/admin-auth.guard';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../audit.service';
import { DailyAudioDto, DailyAudioQueryDto } from './content.dto';

/** 每日 60 秒音频：每天一条，publishDate 唯一 */
@ApiTags('后台 · 内容 · 每日音频')
@ApiBearerAuth()
@Roles(AdminRole.OPERATOR)
@UseGuards(AdminAuthGuard)
@Controller('admin/v1/content/daily-audios')
export class AdminDailyAudioController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list(@Query() q: DailyAudioQueryDto) {
    const where = q.status ? { status: q.status } : {};
    const [list, total] = await Promise.all([
      this.prisma.dailyAudio.findMany({ where, orderBy: { publishDate: 'desc' }, skip: q.skip, take: q.pageSize }),
      this.prisma.dailyAudio.count({ where }),
    ]);
    return { list, total, page: q.page, pageSize: q.pageSize };
  }

  @Post()
  async create(@Body() dto: DailyAudioDto, @CurrentAdmin() admin: AdminTokenPayload) {
    const audio = await this.prisma.dailyAudio.create({ data: this.toData(dto) });
    await this.audit.log(admin.sub, 'DAILY_AUDIO_CREATE', audio.id, { publishDate: dto.publishDate });
    return audio;
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: DailyAudioDto, @CurrentAdmin() admin: AdminTokenPayload) {
    const exists = await this.prisma.dailyAudio.count({ where: { id } });
    if (!exists) throw new NotFoundException('音频不存在');
    const audio = await this.prisma.dailyAudio.update({ where: { id }, data: this.toData(dto) });
    await this.audit.log(admin.sub, 'DAILY_AUDIO_UPDATE', id);
    return audio;
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentAdmin() admin: AdminTokenPayload) {
    const exists = await this.prisma.dailyAudio.count({ where: { id } });
    if (!exists) throw new NotFoundException('音频不存在');
    await this.prisma.dailyAudio.delete({ where: { id } });
    await this.audit.log(admin.sub, 'DAILY_AUDIO_DELETE', id);
    return true;
  }

  private toData(dto: DailyAudioDto) {
    return {
      // 按日期存储（@db.Date），取 UTC 零点避免时区偏移到前一天
      publishDate: new Date(`${dto.publishDate.slice(0, 10)}T00:00:00.000Z`),
      title: dto.title.trim(),
      audioKey: dto.audioKey.trim(),
      duration: dto.duration,
      visibleTo: dto.visibleTo,
      status: dto.status,
    };
  }
}
