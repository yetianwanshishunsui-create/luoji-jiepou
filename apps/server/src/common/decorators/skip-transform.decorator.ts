import { SetMetadata } from '@nestjs/common';

/** 跳过统一响应包装（例如微信支付回调需要原样返回） */
export const SKIP_TRANSFORM = 'skipTransform';
export const SkipTransform = () => SetMetadata(SKIP_TRANSFORM, true);
