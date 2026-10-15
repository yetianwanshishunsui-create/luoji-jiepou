/**
 * 线下课报名规则（纯函数）。
 *
 * 状态流转：
 *   报名并下定金单 → DEPOSIT_PENDING ─定金支付→ DEPOSIT_PAID ─尾款支付→ COMPLETED
 *                        │                         （尾款为 0 时定金支付后直接 COMPLETED）
 *                        └─定金单取消 / 超时关闭→ CANCELLED（释放名额）
 *   DEPOSIT_PAID / COMPLETED ─后台取消或定金全额退款→ CANCELLED
 *
 * 名额：DEPOSIT_PENDING（待支付，最长 30 分钟）、DEPOSIT_PAID、COMPLETED 都占用名额。
 * 报名截止：尾款截止时间（之后报名的人来不及付尾款）。
 */

export const ACTIVE_STATUSES = ['DEPOSIT_PENDING', 'DEPOSIT_PAID', 'COMPLETED'] as const;

export interface SessionLike {
  enabled: boolean;
  quota: number;
  startAt: Date;
  balanceDueAt: Date;
}

/** 报名校验：返回问题描述，可报名返回 null */
export function enrollProblem(session: SessionLike, takenSeats: number, hasActiveEnrollment: boolean, now = new Date()): string | null {
  if (!session.enabled) return '该场次已停止报名';
  if (now >= session.startAt) return '该场次已开课';
  if (now >= session.balanceDueAt) return '该场次报名已截止';
  if (hasActiveEnrollment) return '你已报名该场次';
  if (takenSeats >= session.quota) return '该场次名额已满';
  return null;
}

/** 剩余名额 */
export function remainingSeats(quota: number, takenSeats: number): number {
  return Math.max(0, quota - takenSeats);
}

/** 支付成功后的报名状态 */
export function statusAfterPaid(purpose: 'OFFLINE_DEPOSIT' | 'OFFLINE_BALANCE', balanceCent: number): 'DEPOSIT_PAID' | 'COMPLETED' {
  if (purpose === 'OFFLINE_BALANCE') return 'COMPLETED';
  return balanceCent > 0 ? 'DEPOSIT_PAID' : 'COMPLETED';
}

/** 付尾款校验 */
export function balanceProblem(status: string, session: Pick<SessionLike, 'balanceDueAt'> & { balanceCent: number }, now = new Date()): string | null {
  if (status === 'COMPLETED') return '尾款已支付';
  if (status !== 'DEPOSIT_PAID') return '请先支付定金';
  if (session.balanceCent <= 0) return '该场次无需支付尾款';
  if (now >= session.balanceDueAt) return '已超过尾款截止时间，请联系工作人员';
  return null;
}
