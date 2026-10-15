import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** 后台操作审计 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  log(adminId: string, action: string, target?: string, detail?: Prisma.InputJsonValue) {
    return this.prisma.auditLog.create({ data: { adminId, action, target, detail } });
  }
}
