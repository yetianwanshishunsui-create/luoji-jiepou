import { balanceProblem, enrollProblem, remainingSeats, statusAfterPaid } from './enrollment.rules';

const d = (s: string) => new Date(s);
const now = d('2026-10-15T10:00:00Z');
const session = { enabled: true, quota: 30, startAt: d('2026-12-01T01:00:00Z'), balanceDueAt: d('2026-11-25T00:00:00Z'), balanceCent: 150000 };

describe('enrollProblem', () => {
  it('正常可报名', () => expect(enrollProblem(session, 10, false, now)).toBeNull());
  it('停用 / 已开课 / 报名截止', () => {
    expect(enrollProblem({ ...session, enabled: false }, 0, false, now)).toBe('该场次已停止报名');
    expect(enrollProblem(session, 0, false, d('2026-12-01T02:00:00Z'))).toBe('该场次已开课');
    expect(enrollProblem(session, 0, false, d('2026-11-26T00:00:00Z'))).toBe('该场次报名已截止');
  });
  it('名额已满 / 重复报名', () => {
    expect(enrollProblem(session, 30, false, now)).toBe('该场次名额已满');
    expect(enrollProblem(session, 1, true, now)).toBe('你已报名该场次');
  });
});

describe('remainingSeats', () => {
  it('不出现负数', () => {
    expect(remainingSeats(30, 12)).toBe(18);
    expect(remainingSeats(30, 31)).toBe(0);
  });
});

describe('statusAfterPaid', () => {
  it('定金支付后待付尾款；无尾款直接完成；尾款支付后完成', () => {
    expect(statusAfterPaid('OFFLINE_DEPOSIT', 150000)).toBe('DEPOSIT_PAID');
    expect(statusAfterPaid('OFFLINE_DEPOSIT', 0)).toBe('COMPLETED');
    expect(statusAfterPaid('OFFLINE_BALANCE', 150000)).toBe('COMPLETED');
  });
});

describe('balanceProblem', () => {
  it('已付定金且未过截止可付尾款', () => expect(balanceProblem('DEPOSIT_PAID', session, now)).toBeNull());
  it('其他状态 / 无尾款 / 逾期', () => {
    expect(balanceProblem('DEPOSIT_PENDING', session, now)).toBe('请先支付定金');
    expect(balanceProblem('COMPLETED', session, now)).toBe('尾款已支付');
    expect(balanceProblem('CANCELLED', session, now)).toBe('请先支付定金');
    expect(balanceProblem('DEPOSIT_PAID', { ...session, balanceCent: 0 }, now)).toBe('该场次无需支付尾款');
    expect(balanceProblem('DEPOSIT_PAID', session, d('2026-11-25T00:00:01Z'))).toBe('已超过尾款截止时间，请联系工作人员');
  });
});
