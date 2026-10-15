import { SetMetadata } from '@nestjs/common';

/** 标记接口无需登录（在已挂 UserAuthGuard 的控制器内单独放行） */
export const IS_PUBLIC = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC, true);
