import type { Prisma } from '@prisma/client';
import type { IdentityType } from '@luoji/shared';

/** visibleTo(JSON 数组) 包含当前身份 */
export function visibleFor(identity: IdentityType | null | undefined): Prisma.JsonFilter | undefined {
  return identity ? { array_contains: [identity] } : undefined;
}

export function isVisibleTo(visibleTo: unknown, identity: IdentityType | null | undefined): boolean {
  return !!identity && Array.isArray(visibleTo) && visibleTo.includes(identity);
}
