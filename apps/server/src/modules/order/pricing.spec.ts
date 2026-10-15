import { couponDiscount, effectivePrice } from './pricing';

const d = (s: string) => new Date(s);

describe('effectivePrice', () => {
  const now = d('2026-10-14T10:00:00Z');

  it('无规则取原价', () => {
    expect(effectivePrice(19900, [], now)).toBe(19900);
  });

  it('时间窗内取最低价，窗外和停用规则忽略', () => {
    const rules = [
      { priceCent: 9900, startAt: d('2026-10-01'), endAt: d('2026-10-31'), enabled: true },
      { priceCent: 8800, startAt: d('2026-09-01'), endAt: d('2026-10-01'), enabled: true },
      { priceCent: 100, startAt: d('2026-10-01'), endAt: d('2026-10-31'), enabled: false },
    ];
    expect(effectivePrice(19900, rules, now)).toBe(9900);
  });

  it('规则价高于原价时不加价', () => {
    expect(effectivePrice(5000, [{ priceCent: 9900, startAt: d('2026-01-01'), endAt: d('2027-01-01'), enabled: true }], now)).toBe(5000);
  });
});

describe('couponDiscount', () => {
  const now = d('2026-10-14T10:00:00Z');
  const base = { validFrom: d('2026-10-01'), validTo: d('2026-11-01'), enabled: true };

  it('满减未达门槛不生效', () => {
    expect(couponDiscount(9900, { ...base, type: 'FULL_REDUCTION', thresholdCent: 10000, discountCent: 2000 }, now)).toBe(0);
  });

  it('满减达到门槛生效', () => {
    expect(couponDiscount(10000, { ...base, type: 'FULL_REDUCTION', thresholdCent: 10000, discountCent: 2000 }, now)).toBe(2000);
  });

  it('立减不超过订单金额，至少保留 1 分', () => {
    expect(couponDiscount(500, { ...base, type: 'DIRECT', thresholdCent: 0, discountCent: 1000 }, now)).toBe(499);
  });

  it('过期券不生效', () => {
    expect(couponDiscount(10000, { ...base, validTo: d('2026-10-10'), type: 'DIRECT', thresholdCent: 0, discountCent: 1000 }, now)).toBe(0);
  });
});
