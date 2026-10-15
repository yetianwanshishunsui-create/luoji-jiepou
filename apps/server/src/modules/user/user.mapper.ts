import type { User } from '@prisma/client';
import type { UserProfile } from '@luoji/shared';

export function toUserProfile(user: User): UserProfile {
  return {
    id: user.id,
    nickname: user.nickname,
    avatar: user.avatar,
    identityType: user.identityType,
    certStatus: user.certStatus,
    phoneMasked: user.phoneMasked,
  };
}
