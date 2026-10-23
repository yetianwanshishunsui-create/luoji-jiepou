/**
 * 课程评价规则（纯函数）。
 *
 * - 只有购买过的学员能评价：线上课程看学习权益（含专栏 / 系列带来的权益），线下课看是否已付定金或报名完成；
 *   免费课程不开放评价（没有“购买”，评价难以代表付费用户的真实反馈）。
 * - 每人每门课一条，可修改；修改后重新走内容安全检测。
 * - 内容安全：微信 msgSecCheck 建议 pass → 直接展示；review 或检测失败 → 待人工审核；risky → 拒绝提交。
 */
import type { ReviewStatus } from '@luoji/shared';

export const REVIEW_MIN_LENGTH = 5;
export const REVIEW_MAX_LENGTH = 500;

/** 校验评价内容，返回问题描述；合法返回 null */
export function reviewProblem(input: { rating: number; content: string }): string | null {
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) return '请选择 1~5 星评分';
  const text = input.content.trim();
  if (text.length < REVIEW_MIN_LENGTH) return `评价内容至少 ${REVIEW_MIN_LENGTH} 个字`;
  if (text.length > REVIEW_MAX_LENGTH) return `评价内容不能超过 ${REVIEW_MAX_LENGTH} 个字`;
  return null;
}

/** 评价资格：免费课程不可评；线上看权益，线下看报名 */
export function canReview(input: { free: boolean; owned: boolean; enrolled: boolean }): boolean {
  if (input.free) return false;
  return input.owned || input.enrolled;
}

/** 内容安全检测结果 → 评价状态；risky 返回 null 表示拒绝提交 */
export type SecSuggest = 'pass' | 'review' | 'risky' | 'error';

export function statusAfterSecCheck(suggest: SecSuggest): ReviewStatus | null {
  if (suggest === 'pass') return 'VISIBLE';
  if (suggest === 'risky') return null;
  return 'PENDING';
}

/** 展示名：匿名显示「匿名用户」，否则昵称首字 + **（不暴露全名） */
export function reviewerName(anonymous: boolean, nickname: string | null | undefined): string {
  if (anonymous || !nickname?.trim()) return '匿名用户';
  const name = nickname.trim();
  return `${[...name][0]}**`;
}

/** 评分汇总：平均分保留 1 位小数，无评价时为 null */
export function ratingSummary(ratings: number[]): { count: number; avgRating: number | null } {
  if (!ratings.length) return { count: 0, avgRating: null };
  const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  return { count: ratings.length, avgRating: Math.round(avg * 10) / 10 };
}
