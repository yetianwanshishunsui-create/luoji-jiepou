import { SetMetadata } from '@nestjs/common';

/** 标记接口需要“认证通过”才能访问（认证准入），由 CertGuard 校验 */
export const REQUIRE_CERT = 'requireCert';
export const RequireCert = () => SetMetadata(REQUIRE_CERT, true);
