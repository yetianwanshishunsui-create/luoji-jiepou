import { CertStatus } from '@luoji/shared';
import { nextCertStatus } from './cert.state';

describe('cert state machine', () => {
  it('未认证可以提交', () => {
    expect(nextCertStatus(CertStatus.UNSUBMITTED, 'SUBMIT')).toBe(CertStatus.PENDING);
  });

  it('审核中不能重复提交', () => {
    expect(nextCertStatus(CertStatus.PENDING, 'SUBMIT')).toBeNull();
  });

  it('已通过不能再次提交，只能被撤销', () => {
    expect(nextCertStatus(CertStatus.APPROVED, 'SUBMIT')).toBeNull();
    expect(nextCertStatus(CertStatus.APPROVED, 'REVOKE')).toBe(CertStatus.REVOKED);
  });

  it('驳回后可重新提交', () => {
    expect(nextCertStatus(CertStatus.PENDING, 'REJECT')).toBe(CertStatus.REJECTED);
    expect(nextCertStatus(CertStatus.REJECTED, 'SUBMIT')).toBe(CertStatus.PENDING);
  });

  it('只有审核中可以通过或驳回', () => {
    expect(nextCertStatus(CertStatus.UNSUBMITTED, 'APPROVE')).toBeNull();
    expect(nextCertStatus(CertStatus.REJECTED, 'APPROVE')).toBeNull();
    expect(nextCertStatus(CertStatus.APPROVED, 'REJECT')).toBeNull();
  });
});
