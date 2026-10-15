import { CertStatus } from '@luoji/shared';

/**
 * 认证状态机（技术方案 4.1）
 * UNSUBMITTED ─提交→ PENDING ─通过→ APPROVED ─撤销→ REVOKED
 *                       └─驳回→ REJECTED ─重新提交→ PENDING
 * REVOKED 允许重新提交。
 */
export type CertAction = 'SUBMIT' | 'APPROVE' | 'REJECT' | 'REVOKE';

const TRANSITIONS: Record<CertAction, { from: CertStatus[]; to: CertStatus }> = {
  SUBMIT: { from: [CertStatus.UNSUBMITTED, CertStatus.REJECTED, CertStatus.REVOKED], to: CertStatus.PENDING },
  APPROVE: { from: [CertStatus.PENDING], to: CertStatus.APPROVED },
  REJECT: { from: [CertStatus.PENDING], to: CertStatus.REJECTED },
  REVOKE: { from: [CertStatus.APPROVED], to: CertStatus.REVOKED },
};

/** 返回目标状态；非法流转返回 null */
export function nextCertStatus(current: CertStatus, action: CertAction): CertStatus | null {
  const rule = TRANSITIONS[action];
  return rule.from.includes(current) ? rule.to : null;
}
