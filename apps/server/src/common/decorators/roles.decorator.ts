import { SetMetadata } from '@nestjs/common';
import type { AdminRole } from '@luoji/shared';

/** 后台接口允许的角色；SUPER_ADMIN 始终放行 */
export const ROLES = 'roles';
export const Roles = (...roles: AdminRole[]) => SetMetadata(ROLES, roles);
