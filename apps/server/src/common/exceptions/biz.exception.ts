import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@luoji/shared';

/** 业务异常：HTTP 状态码 + 业务错误码，统一由 AllExceptionsFilter 输出 */
export class BizException extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super({ code, message }, status);
  }
}
