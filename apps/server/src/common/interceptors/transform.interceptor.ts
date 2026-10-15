import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { ApiResponse } from '@luoji/shared';
import type { Request } from 'express';
import { Observable, map } from 'rxjs';
import { SKIP_TRANSFORM } from '../decorators/skip-transform.decorator';
import { Reflector } from '@nestjs/core';

/** 把控制器返回值包装为 { code: 0, message: 'ok', data, traceId } */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request & { traceId?: string }>();
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_TRANSFORM, [context.getHandler(), context.getClass()]);
    if (skip) return next.handle();

    return next.handle().pipe(
      map((data): ApiResponse => ({ code: 0, message: 'ok', data: data ?? null, traceId: req.traceId })),
    );
  }
}
