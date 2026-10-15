/**
 * 课时播放权限判定（纯函数，技术方案 4.3）
 * - FULL：完整播放（免费课程 / 已购 / 整节免费试看）
 * - TRIAL：试看 trialSeconds 秒
 * - DENY：无权限
 */
export type LessonAccess = { mode: 'FULL' } | { mode: 'TRIAL'; trialSeconds: number } | { mode: 'DENY' };

export function decideLessonAccess(input: {
  productFree: boolean;
  owned: boolean;
  isTrial: boolean;
  trialSeconds: number;
}): LessonAccess {
  if (input.productFree || input.owned) return { mode: 'FULL' };
  if (input.isTrial) {
    return input.trialSeconds > 0 ? { mode: 'TRIAL', trialSeconds: input.trialSeconds } : { mode: 'FULL' };
  }
  return { mode: 'DENY' };
}
