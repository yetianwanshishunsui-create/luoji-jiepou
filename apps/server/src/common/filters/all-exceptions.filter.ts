import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ErrorCode } from '@luoji/shared';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { BizException } from '../exceptions/biz.exception';

const STATUS_TO_CODE: Partial<Record<number, ErrorCode>> = {
  400: ErrorCode.BAD_REQUEST,
  401: ErrorCode.UNAUTHORIZED,
  403: ErrorCode.FORBIDDEN,
  404: ErrorCode.NOT_FOUND,
  429: ErrorCode.TOO_MANY_REQUESTS,
  501: ErrorCode.NOT_IMPLEMENTED,
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request & { traceId?: string }>();
    const res = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: ErrorCode = ErrorCode.INTERNAL;
    let message = '服务器开小差了，请稍后再试';

    if (exception instanceof BizException) {
      status = exception.getStatus();
      code = exception.code;
      message = exception.message;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = STATUS_TO_CODE[status] ?? ErrorCode.INTERNAL;
      const body = exception.getResponse();
      const raw = typeof body === 'string' ? body : (body as { message?: string | string[] }).message;
      message = Array.isArray(raw) ? raw.join('；') : (raw ?? exception.message);
      // 限流异常默认是英文，统一成中文提示
      if (status === HttpStatus.TOO_MANY_REQUESTS && /ThrottlerException/.test(message)) message = '请求过于频繁，请稍后再试';
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError && exception.code === 'P2002') {
      // 唯一约束冲突（例如同一天重复添加每日音频）
      status = HttpStatus.CONFLICT;
      code = ErrorCode.BAD_REQUEST;
      message = '数据已存在，请勿重复添加';
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError && exception.code === 'P2025') {
      status = HttpStatus.NOT_FOUND;
      code = ErrorCode.NOT_FOUND;
      message = '数据不存在或已被删除';
    } else {
      this.logger.error(`${req.method} ${req.url} traceId=${req.traceId}`, (exception as Error)?.stack);
    }

    res.status(status).json({ code, message, data: null, traceId: req.traceId });
  }
}
