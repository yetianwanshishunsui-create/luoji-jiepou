import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** 键值型运营配置（SiteConfig 表），未配置时返回默认值 */
@Injectable()
export class SiteConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async get<T>(key: string, fallback: T): Promise<T> {
    const row = await this.prisma.siteConfig.findUnique({ where: { key } });
    return row ? (row.value as T) : fallback;
  }

  async getWithMeta<T>(key: string, fallback: T): Promise<{ value: T; updatedAt: Date | null }> {
    const row = await this.prisma.siteConfig.findUnique({ where: { key } });
    return { value: row ? (row.value as T) : fallback, updatedAt: row?.updatedAt ?? null };
  }

  set(key: string, value: unknown) {
    const json = value as Prisma.InputJsonValue;
    return this.prisma.siteConfig.upsert({ where: { key }, create: { key, value: json }, update: { value: json } });
  }
}
