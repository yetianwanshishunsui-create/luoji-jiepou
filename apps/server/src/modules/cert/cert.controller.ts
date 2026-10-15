import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type UserTokenPayload } from '../../common/decorators/current-user.decorator';
import { UserAuthGuard } from '../../common/guards/user-auth.guard';
import { SubmitCertDto } from './cert.dto';
import { CertService } from './cert.service';

@ApiTags('小程序 · 身份认证')
@ApiBearerAuth()
@UseGuards(UserAuthGuard)
@Controller('api/v1/cert')
export class CertController {
  constructor(private readonly cert: CertService) {}

  @Get()
  mine(@CurrentUser() user: UserTokenPayload) {
    return this.cert.getMine(user.sub);
  }

  @Post('upload-sign')
  uploadSign(@CurrentUser() user: UserTokenPayload) {
    return this.cert.getUploadSign(user.sub);
  }

  @Post('submit')
  submit(@CurrentUser() user: UserTokenPayload, @Body() dto: SubmitCertDto) {
    return this.cert.submit(user.sub, dto);
  }
}
