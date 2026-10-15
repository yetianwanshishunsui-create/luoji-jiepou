import { Body, Controller, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsInt, IsString, Max, Min } from 'class-validator';
import type { IdentityType } from '@luoji/shared';
import { CurrentUser, type UserTokenPayload } from '../../common/decorators/current-user.decorator';
import { RequireCert } from '../../common/decorators/require-cert.decorator';
import { CertGuard } from '../../common/guards/cert.guard';
import { UserAuthGuard } from '../../common/guards/user-auth.guard';
import { LearningService } from './learning.service';

class ProgressDto {
  @IsString()
  lessonId: string;

  @IsInt()
  @Min(0)
  @Max(86_400)
  position: number;

  @IsInt()
  @Min(0)
  @Max(86_400)
  duration: number;
}

@ApiTags('小程序 · 学习')
@ApiBearerAuth()
@RequireCert()
@UseGuards(UserAuthGuard, CertGuard)
@Controller('api/v1')
export class LearningController {
  constructor(private readonly learning: LearningService) {}

  @Get('lessons/:id/play-sign')
  playSign(@CurrentUser() user: UserTokenPayload, @Req() req: { identityType: IdentityType }, @Param('id') id: string) {
    return this.learning.playSign(user.sub, req.identityType, id);
  }

  @Post('progress')
  @HttpCode(200)
  report(@CurrentUser() user: UserTokenPayload, @Body() dto: ProgressDto) {
    return this.learning.report(user.sub, dto.lessonId, dto.position, dto.duration);
  }

  @Get('learning/courses')
  myCourses(@CurrentUser() user: UserTokenPayload) {
    return this.learning.myCourses(user.sub);
  }
}
