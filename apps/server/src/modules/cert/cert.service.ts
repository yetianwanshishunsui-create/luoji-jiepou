import { HttpStatus, Injectable, NotFoundException, NotImplementedException } from '@nestjs/common';
import { CertStatus, ErrorCode } from '@luoji/shared';
import { BizException } from '../../common/exceptions/biz.exception';
import { CryptoService } from '../../common/crypto/crypto.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { ReviewCertDto, SubmitCertDto } from './cert.dto';
import { nextCertStatus } from './cert.state';

@Injectable()
export class CertService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  /** 当前用户认证状态 + 最近一次申请（不返回敏感明文） */
  async getMine(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { certStatus: true, identityType: true },
    });
    const latest = await this.prisma.certification.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, identityType: true, status: true, rejectReason: true, createdAt: true, reviewedAt: true },
    });
    return { ...user, latest };
  }

  /**
   * 证件直传私有桶的临时凭证。
   * TODO(WP03)：调用腾讯云 STS 生成仅允许 PutObject 到 cert/{userId}/ 前缀、有效期 10 分钟的临时密钥。
   */
  getUploadSign(_userId: string): never {
    throw new NotImplementedException('证件上传凭证待接入腾讯云 STS（WP03）');
  }

  async submit(userId: string, dto: SubmitCertDto) {
    // 只允许引用本人目录下的文件，防止拿别人上传的证件冒充
    if (dto.files.some((key) => !key.startsWith(`cert/${userId}/`))) {
      throw new BizException(ErrorCode.BAD_REQUEST, '证件文件不属于当前用户');
    }

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { certStatus: true } });
      const next = nextCertStatus(user.certStatus, 'SUBMIT');
      if (!next) {
        throw new BizException(ErrorCode.CERT_STATE_INVALID, `当前状态（${user.certStatus}）不能提交认证`, HttpStatus.CONFLICT);
      }

      const cert = await tx.certification.create({
        data: {
          userId,
          identityType: dto.identityType,
          realNameEnc: this.crypto.encrypt(dto.realName),
          licenseNoEnc: dto.licenseNo ? this.crypto.encrypt(dto.licenseNo) : null,
          licenseNoHash: dto.licenseNo ? this.crypto.hash(dto.licenseNo) : null,
          organization: dto.organization,
          files: dto.files,
          status: CertStatus.PENDING,
        },
        select: { id: true, status: true, createdAt: true },
      });
      await tx.user.update({ where: { id: userId }, data: { certStatus: next, identityType: dto.identityType } });
      return cert;
    });
  }

  /** 后台审核（通过 / 驳回），并同步用户认证状态 */
  async review(certId: string, reviewerId: string, dto: ReviewCertDto) {
    if (dto.action === 'REJECT' && !dto.rejectReason) {
      throw new BizException(ErrorCode.BAD_REQUEST, '驳回必须填写原因');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const cert = await tx.certification.findUnique({ where: { id: certId } });
      if (!cert) throw new NotFoundException('认证申请不存在');

      const next = nextCertStatus(cert.status, dto.action);
      if (!next) {
        throw new BizException(ErrorCode.CERT_STATE_INVALID, `该申请当前状态（${cert.status}）不能审核`, HttpStatus.CONFLICT);
      }

      // 条件更新防止两个审核员并发处理同一条申请
      const { count } = await tx.certification.updateMany({
        where: { id: certId, status: cert.status },
        data: {
          status: next,
          rejectReason: dto.action === 'REJECT' ? dto.rejectReason : null,
          reviewerId,
          reviewedAt: new Date(),
        },
      });
      if (count !== 1) throw new BizException(ErrorCode.CERT_STATE_INVALID, '该申请已被处理', HttpStatus.CONFLICT);

      await tx.user.update({
        where: { id: cert.userId },
        data: { certStatus: next, identityType: cert.identityType },
      });
      await tx.auditLog.create({
        data: { adminId: reviewerId, action: `CERT_${dto.action}`, target: certId, detail: { rejectReason: dto.rejectReason } },
      });
      return { id: certId, status: next, userId: cert.userId };
    });

    // TODO(WP03)：发送订阅消息通知审核结果
    return result;
  }

  /** 后台查看申请详情：解密姓名 / 证号；证件图片返回临时签名 URL（TODO：COS 签名） */
  async detailForAdmin(certId: string, adminId: string) {
    const cert = await this.prisma.certification.findUnique({
      where: { id: certId },
      include: { user: { select: { id: true, nickname: true, phoneMasked: true } } },
    });
    if (!cert) throw new NotFoundException('认证申请不存在');

    await this.prisma.auditLog.create({ data: { adminId, action: 'CERT_VIEW', target: certId } });

    const { realNameEnc, licenseNoEnc, licenseNoHash: _hash, ...rest } = cert;
    return {
      ...rest,
      realName: this.crypto.decrypt(realNameEnc),
      licenseNo: licenseNoEnc ? this.crypto.decrypt(licenseNoEnc) : null,
      // TODO(WP03)：files 转换为 5 分钟有效的 COS 私有桶签名 URL
      fileUrls: [] as string[],
    };
  }
}
