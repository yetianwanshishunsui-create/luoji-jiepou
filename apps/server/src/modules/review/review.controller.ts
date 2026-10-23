import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsString, Max, MaxLength, Min } from 'class-validator';
import type { IdentityType } from '@luoji/shared';
import { CurrentUser, type UserTokenPayload } from '../../common/decorators/current-user.decorator';
import { RequireCert } from '../../common/decorators/require-cert.decorator';
import { PageQueryDto } from '../../common/dto/page.dto';
import { CertGuard } from '../../common/guards/cert.guard';
import { UserAuthGuard } from '../../common/guards/user-auth.guard';
import { REVIEW_MAX_LENGTH } from './review.rules';
import { ReviewService } from './review.service';

class SubmitReviewDto {
  @IsInt({ message: '请选择 1~5 星评分' })
  @Min(1, { message: '请选择 1~5 星评分' })
  @Max(5, { message: '请选择 1~5 星评分' })
  rating: number;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: '请填写评价内容' })
  @MaxLength(REVIEW_MAX_LENGTH, { message: `评价内容不能超过 ${REVIEW_MAX_LENGTH} 个字` })
  content: string;

  @IsBoolean()
  anonymous: boolean;
}

/** 课程评价：认证用户可看，购买过的学员可写 */
@ApiTags('小程序 · 评价')
@ApiBearerAuth()
@RequireCert()
@UseGuards(UserAuthGuard, CertGuard)
@Controller('api/v1/products/:id/reviews')
export class ReviewController {
  constructor(private readonly reviews: ReviewService) {}

  @Get()
  list(@CurrentUser() user: UserTokenPayload, @Req() req: { identityType: IdentityType }, @Param('id') id: string, @Query() q: PageQueryDto) {
    return this.reviews.list(user.sub, req.identityType, id, q.page, q.pageSize);
  }

  @Post()
  submit(@CurrentUser() user: UserTokenPayload, @Req() req: { identityType: IdentityType }, @Param('id') id: string, @Body() dto: SubmitReviewDto) {
    return this.reviews.submit(user.sub, user.openid, req.identityType, id, dto);
  }
}
