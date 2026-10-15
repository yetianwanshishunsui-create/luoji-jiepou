import { activeRule, claimProblem, couponInScope, evaluateCoupons, windowsOverlap } from './marketing.rules';

const d = (s: string) => new Date(s);
const now = d('2026-10-15T10:00:00Z');
const product = { id: 'p1', categoryIds: ['sub', 'root'] };
const base = {
  type: 'DIRECT' as const,
  thresholdCent: 0,
  discountCent: 1000,
  scope: 'ALL' as const,
  scopeIds: null,
  validFrom: d('2026-10-01'),
  validTo: d('2026-11-01'),
  enabled: true,
};

describe('couponInScope', () => {
  it('通用券覆盖所有商品', () => {
    expect(couponInScope({ scope: 'ALL', scopeIds: null }, product)).toBe(true);
  });
  it('指定课程券只匹配列表内课程', () => {
    expect(couponInScope({ scope: 'PRODUCT', scopeIds: ['p1'] }, product)).toBe(true);
    expect(couponInScope({ scope: 'PRODUCT', scopeIds: ['p2'] }, product)).toBe(false);
  });
  it('分类券匹配二级分类或其一级分类', () => {
    expect(couponInScope({ scope: 'CATEGORY', scopeIds: ['root'] }, product)).toBe(true);
    expect(couponInScope({ scope: 'CATEGORY', scopeIds: ['other'] }, product)).toBe(false);
    expect(couponInScope({ scope: 'CATEGORY', scopeIds: ['root'] }, { id: 'p3', categoryIds: [] })).toBe(false);
  });
});

describe('evaluateCoupons', () => {
  const list = [
    { id: 'small', coupon: { ...base, discountCent: 500 } },
    { id: 'big', coupon: { ...base, discountCent: 3000 } },
    { id: 'threshold', coupon: { ...base, type: 'FULL_REDUCTION' as const, thresholdCent: 30000, discountCent: 9000 } },
    { id: 'expired', coupon: { ...base, validTo: d('2026-10-10') } },
    { id: 'other', coupon: { ...base, scope: 'PRODUCT' as const, scopeIds: ['p2'] } },
    { id: 'big-soon', coupon: { ...base, discountCent: 3000, validTo: d('2026-10-20') } },
  ];

  it('可用券按优惠从高到低，同额先过期的在前，不可用的放最后并给出原因', () => {
    const res = evaluateCoupons(19900, product, list, now);
    expect(res.map((r) => r.item.id)).toEqual(['big-soon', 'big', 'small', 'threshold', 'expired', 'other']);
    expect(res.find((r) => r.item.id === 'threshold')?.reason).toBe('满 ¥300 可用');
    expect(res.find((r) => r.item.id === 'expired')?.reason).toBe('已过期');
    expect(res.find((r) => r.item.id === 'other')?.reason).toBe('不适用于该课程');
  });
});

describe('activeRule', () => {
  const rules = [
    { id: 'early', priceCent: 9900, startAt: d('2026-10-01'), endAt: d('2026-10-20'), enabled: true },
    { id: 'flash', priceCent: 7900, startAt: d('2026-10-15T09:00:00Z'), endAt: d('2026-10-15T12:00:00Z'), enabled: true },
    { id: 'off', priceCent: 100, startAt: d('2026-10-01'), endAt: d('2026-11-01'), enabled: false },
  ];
  it('取生效中价格最低的规则', () => {
    expect(activeRule(19900, rules, now)?.id).toBe('flash');
    expect(activeRule(19900, rules, d('2026-10-16'))?.id).toBe('early');
    expect(activeRule(19900, rules, d('2026-10-25'))).toBeNull();
  });
  it('规则价不低于原价时不算优惠', () => {
    expect(activeRule(5000, rules, d('2026-10-16'))).toBeNull();
  });
});

describe('windowsOverlap', () => {
  it('首尾相接不算重叠', () => {
    expect(windowsOverlap({ startAt: d('2026-10-01'), endAt: d('2026-10-10') }, { startAt: d('2026-10-10'), endAt: d('2026-10-20') })).toBe(false);
    expect(windowsOverlap({ startAt: d('2026-10-01'), endAt: d('2026-10-11') }, { startAt: d('2026-10-10'), endAt: d('2026-10-20') })).toBe(true);
  });
});

describe('claimProblem', () => {
  const c = { enabled: true, claimable: true, validTo: d('2026-11-01'), totalCount: 100, issuedCount: 10, perUserLimit: 1 };
  it('正常可领', () => expect(claimProblem(c, 0, now)).toBeNull());
  it('领完 / 达到上限 / 不可领 / 过期', () => {
    expect(claimProblem({ ...c, issuedCount: 100 }, 0, now)).toBe('优惠券已被领完');
    expect(claimProblem({ ...c, totalCount: 0, issuedCount: 99999 }, 0, now)).toBeNull();
    expect(claimProblem(c, 1, now)).toBe('已达到领取上限');
    expect(claimProblem({ ...c, claimable: false }, 0, now)).toBe('该优惠券不可领取');
    expect(claimProblem({ ...c, validTo: d('2026-10-01') }, 0, now)).toBe('该优惠券已过期');
  });
});
