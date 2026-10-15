import { couponConfigProblem, lockedChangeProblem, type CouponConfig } from './coupon-check';

const d = (s: string) => new Date(s);
const base: CouponConfig = {
  type: 'FULL_REDUCTION',
  thresholdCent: 10000,
  discountCent: 2000,
  scope: 'ALL',
  scopeIds: [],
  totalCount: 100,
  validFrom: d('2026-10-01'),
  validTo: d('2026-11-01'),
};

describe('couponConfigProblem', () => {
  it('合法配置', () => expect(couponConfigProblem(base)).toBeNull());
  it('时间、门槛、范围校验', () => {
    expect(couponConfigProblem({ ...base, validTo: d('2026-09-01') })).toBe('结束时间必须晚于开始时间');
    expect(couponConfigProblem({ ...base, thresholdCent: 2000 })).toBe('满减门槛必须高于优惠金额');
    expect(couponConfigProblem({ ...base, type: 'DIRECT', thresholdCent: 0 })).toBeNull();
    expect(couponConfigProblem({ ...base, scope: 'PRODUCT' })).toBe('请选择适用的分类或课程');
  });
});

describe('lockedChangeProblem', () => {
  const issued = { ...base, issuedCount: 30 };
  it('未发放时可任意修改', () => {
    expect(lockedChangeProblem({ ...base, issuedCount: 0 }, { ...base, discountCent: 5000 })).toBeNull();
  });
  it('已发放后锁定金额、门槛、范围、开始时间', () => {
    expect(lockedChangeProblem(issued, { ...base, discountCent: 5000 })).toMatch(/不能修改/);
    expect(lockedChangeProblem(issued, { ...base, scope: 'PRODUCT', scopeIds: ['p1'] })).toMatch(/不能修改/);
    expect(lockedChangeProblem(issued, { ...base, validFrom: d('2026-10-02') })).toMatch(/不能修改/);
  });
  it('已发放后可延长结束时间、调整总量（不低于已发放量，0 为不限）', () => {
    expect(lockedChangeProblem(issued, { ...base, validTo: d('2026-12-01') })).toBeNull();
    expect(lockedChangeProblem(issued, { ...base, totalCount: 0 })).toBeNull();
    expect(lockedChangeProblem(issued, { ...base, totalCount: 20 })).toBe('发放总量不能少于已发放数量（30）');
  });
});
