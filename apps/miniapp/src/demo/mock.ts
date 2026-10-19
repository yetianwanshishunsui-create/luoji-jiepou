/**
 * 演示版后端（VITE_DEMO=true）：不请求服务器，在本机模拟接口，状态保存在本地存储。
 * 规则尽量与后端一致：认证准入、身份可见、早鸟价、优惠券、订单、线下课报名、学习进度。
 */
import { ErrorCode } from '@luoji/shared';
import type { CertStatus, EnrollmentStatus, IdentityType, UserProfile } from '@luoji/shared';
import { BANNERS, CATEGORIES, COUPONS, HOME_SECTIONS, JOIN_PAGE, PRODUCTS, type DemoProduct } from './data';

const KEY = 'luoji_demo_state';
const PAY_TIMEOUT = 30 * 60_000;
/** 提交认证后自动审核通过的时间 */
const AUTO_APPROVE_MS = 3000;

interface Order {
  orderNo: string;
  purpose: 'PRODUCT' | 'OFFLINE_DEPOSIT' | 'OFFLINE_BALANCE';
  productId: string;
  title: string;
  status: 'CREATED' | 'PAID' | 'CLOSED' | 'CANCELLED' | 'REFUNDED';
  totalCent: number;
  payCent: number;
  userCouponId: string | null;
  enrollmentId: string | null;
  createdAt: number;
  expireAt: number;
}

interface UserCoupon {
  id: string;
  couponId: string;
  status: 'UNUSED' | 'LOCKED' | 'USED' | 'EXPIRED';
  claimedAt: number;
  usedAt: number | null;
}

interface Enrollment {
  id: string;
  sessionId: string;
  productId: string;
  status: EnrollmentStatus;
  contactName: string;
  contactPhoneMasked: string;
  cancelReason: string | null;
  createdAt: number;
  depositOrderNo: string;
  balanceOrderNo: string | null;
}

interface State {
  /** 演示开始时间：早鸟价、场次时间都相对它计算 */
  t0: number;
  seq: number;
  user: { id: string; nickname: string; certStatus: CertStatus; identityType: IdentityType | null; submittedAt: number | null };
  owned: string[];
  progress: Record<string, { position: number; completed: boolean; at: number }>;
  orders: Order[];
  coupons: UserCoupon[];
  enrollments: Enrollment[];
  leads: number;
}

function fresh(): State {
  return {
    t0: Date.now(),
    seq: 1,
    user: { id: `demo_${Math.random().toString(36).slice(2, 10)}`, nickname: '演示学员', certStatus: 'UNSUBMITTED', identityType: null, submittedAt: null },
    owned: [],
    progress: {},
    orders: [],
    coupons: [],
    enrollments: [],
    leads: 0,
  };
}

let state: State | null = null;

function load(): State {
  if (state) return state;
  const saved = uni.getStorageSync(KEY) as State | '';
  state = saved && saved.t0 ? saved : fresh();
  return state;
}

function save() {
  try {
    uni.setStorageSync(KEY, state);
  } catch {
    // 浏览器禁用本地存储（如无痕模式）时只保存在内存中，刷新后重新开始
  }
}

export function resetDemo() {
  state = fresh();
  save();
}

class MockError extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

const fail = (code: number, message: string, status = 400): never => {
  throw new MockError(code, message, status);
};

const iso = (ms: number) => new Date(ms).toISOString();
const nextId = (s: State, prefix: string) => `${prefix}${Date.now().toString().slice(-6)}${s.seq++}`;

// ───────── 用户与认证 ─────────

/** 提交后 3 秒自动通过（演示用，正式环境由审核员在后台处理） */
function settleCert(s: State) {
  if (s.user.certStatus === 'PENDING' && s.user.submittedAt && Date.now() - s.user.submittedAt >= AUTO_APPROVE_MS) {
    s.user.certStatus = 'APPROVED';
    save();
  }
}

function profile(s: State): UserProfile {
  settleCert(s);
  return { id: s.user.id, nickname: s.user.nickname, avatar: null, identityType: s.user.identityType, certStatus: s.user.certStatus, phoneMasked: '138****6621' };
}

function requireCert(s: State) {
  settleCert(s);
  if (s.user.certStatus !== 'APPROVED') fail(ErrorCode.CERT_REQUIRED, '请先完成身份认证', 403);
  return s.user.identityType as IdentityType;
}

/** 演示工具：直接切换身份（视为已认证） */
export function switchIdentity(identity: IdentityType) {
  const s = load();
  s.user.identityType = identity;
  s.user.certStatus = 'APPROVED';
  s.user.submittedAt = Date.now();
  save();
}

// ───────── 课程与价格 ─────────

const findProduct = (id: string) => PRODUCTS.find((p) => p.id === id) ?? fail(ErrorCode.NOT_FOUND, '课程不存在', 404);

function visibleProducts(identity: IdentityType) {
  return PRODUCTS.filter((p) => p.visibleTo.includes(identity));
}

function activeRule(s: State, p: DemoProduct) {
  if (!p.rule) return null;
  const endAt = s.t0 + p.rule.endIn;
  return Date.now() < endAt ? { ...p.rule, endAt } : null;
}

/** 场次时间按演示开始当天计算：上午 9 点开课、下午 5 点结束，尾款截止为当天 18 点 */
function sessionsOf(s: State, p: DemoProduct) {
  const day0 = new Date(s.t0).setHours(0, 0, 0, 0);
  const H = 3_600_000;
  return (p.sessions ?? []).map((x) => ({
    ...x,
    startAt: day0 + x.startIn + 9 * H,
    endAt: day0 + x.startIn + (x.days - 1) * 86_400_000 + 17 * H,
    balanceDueAt: day0 + x.balanceDueIn + 18 * H,
  }));
}

function card(s: State, p: DemoProduct) {
  const rule = activeRule(s, p);
  const open = sessionsOf(s, p).filter((x) => x.startAt > Date.now());
  // 线下课卡片显示最低定金（及该场次的价格说明）
  const cheapest = open.length ? open.reduce((a, b) => (b.depositCent < a.depositCent ? b : a)) : null;
  return {
    id: p.id,
    type: p.type,
    title: p.title,
    subtitle: p.subtitle,
    cover: p.cover,
    pricingMode: p.pricingMode,
    priceCent: p.priceCent,
    originCent: null,
    currentPriceCent: rule ? rule.priceCent : p.priceCent,
    priceRule: rule ? { type: rule.type, endAt: iso(rule.endAt) } : null,
    minDepositCent: cheapest ? cheapest.depositCent : p.type === 'OFFLINE' ? null : undefined,
    pricePrefix: (cheapest ? cheapest.pricePrefix : p.pricePrefix) ?? null,
  };
}

/** 是否拥有学习权限：免费课程、已购课程、已购专栏 / 系列中的课程 */
function owns(s: State, p: DemoProduct) {
  if (p.pricingMode === 'FREE' && p.type !== 'OFFLINE') return true;
  if (s.owned.includes(p.id)) return true;
  return PRODUCTS.some((bundle) => bundle.items?.includes(p.id) && s.owned.includes(bundle.id));
}

function findLesson(lessonId: string) {
  for (const p of PRODUCTS) for (const ch of p.chapters) for (const l of ch.lessons) if (l.id === lessonId) return { product: p, lesson: l };
  return fail(ErrorCode.NOT_FOUND, '课时不存在', 404);
}

// ───────── 优惠券 ─────────

const couponDef = (id: string) => COUPONS.find((c) => c.id === id)!;
const couponValidTo = (s: State, uc: UserCoupon) => uc.claimedAt + 30 * 86_400_000;

function couponView(s: State, uc: UserCoupon) {
  const c = couponDef(uc.couponId);
  return { name: c.name, description: c.description, type: c.type, thresholdCent: c.thresholdCent, discountCent: c.discountCent, validTo: iso(couponValidTo(s, uc)) };
}

/** 不可用原因；可用返回 null */
function couponProblem(uc: UserCoupon, p: DemoProduct, amountCent: number): string | null {
  const c = couponDef(uc.couponId);
  if (c.scope === 'PRODUCT' && !c.productIds.includes(p.id)) return '不适用于该课程';
  if (c.scope === 'CATEGORY' && !c.categoryIds.includes(p.categoryId)) return '不适用于该课程分类';
  if (amountCent < c.thresholdCent) return `满 ${c.thresholdCent / 100} 元可用`;
  return null;
}

function releaseCoupon(s: State, o: Order) {
  const uc = s.coupons.find((x) => x.id === o.userCouponId);
  if (uc && uc.status === 'LOCKED') uc.status = 'UNUSED';
}

// ───────── 订单 ─────────

/** 超时未支付自动关闭 */
function closeExpired(s: State) {
  let changed = false;
  for (const o of s.orders) {
    if (o.status === 'CREATED' && Date.now() > o.expireAt) {
      o.status = 'CLOSED';
      releaseCoupon(s, o);
      const e = s.enrollments.find((x) => x.depositOrderNo === o.orderNo && x.status === 'DEPOSIT_PENDING');
      if (e) {
        e.status = 'CANCELLED';
        e.cancelReason = '定金超时未支付，名额已释放';
      }
      changed = true;
    }
  }
  if (changed) save();
}

function newOrder(s: State, o: Omit<Order, 'orderNo' | 'status' | 'createdAt' | 'expireAt'>): Order {
  const order: Order = { ...o, orderNo: nextId(s, 'LJ'), status: 'CREATED', createdAt: Date.now(), expireAt: Date.now() + PAY_TIMEOUT };
  s.orders.unshift(order);
  return order;
}

function markPaid(s: State, o: Order) {
  o.status = 'PAID';
  const uc = s.coupons.find((x) => x.id === o.userCouponId);
  if (uc) {
    uc.status = 'USED';
    uc.usedAt = Date.now();
  }
  if (o.purpose === 'PRODUCT') {
    if (!s.owned.includes(o.productId)) s.owned.push(o.productId);
    return;
  }
  const e = s.enrollments.find((x) => x.id === o.enrollmentId);
  if (!e) return;
  const session = sessionsOf(s, findProduct(e.productId)).find((x) => x.id === e.sessionId)!;
  e.status = o.purpose === 'OFFLINE_BALANCE' || session.balanceCent === 0 ? 'COMPLETED' : 'DEPOSIT_PAID';
}

const ACTIVE = ['DEPOSIT_PENDING', 'DEPOSIT_PAID', 'COMPLETED'];

function enrollmentView(s: State, e: Enrollment) {
  const p = findProduct(e.productId);
  const x = sessionsOf(s, p).find((v) => v.id === e.sessionId)!;
  const orderBrief = (no: string | null) => {
    const o = s.orders.find((v) => v.orderNo === no);
    return o ? { orderNo: o.orderNo, status: o.status, expireAt: iso(o.expireAt) } : null;
  };
  return {
    id: e.id,
    status: e.status,
    contactName: e.contactName,
    contactPhoneMasked: e.contactPhoneMasked,
    cancelReason: e.cancelReason,
    createdAt: iso(e.createdAt),
    product: { id: p.id, title: p.title, cover: p.cover },
    session: { id: x.id, title: x.title, startAt: iso(x.startAt), endAt: iso(x.endAt), address: x.address, depositCent: x.depositCent, balanceCent: x.balanceCent, balanceDueAt: iso(x.balanceDueAt), pricePrefix: x.pricePrefix ?? null },
    depositOrder: orderBrief(e.depositOrderNo),
    balanceOrder: orderBrief(e.balanceOrderNo),
  };
}

// ───────── 路由 ─────────

type Data = Record<string, unknown>;
type Handler = (s: State, data: Data, params: string[]) => unknown;

const routes: [string, RegExp, Handler][] = [
  ['POST', /^\/api\/v1\/auth\/wx-login$/, (s) => ({ accessToken: 'demo', refreshToken: 'demo', user: profile(s) })],
  ['POST', /^\/api\/v1\/auth\/refresh$/, () => ({ accessToken: 'demo', refreshToken: 'demo' })],
  ['GET', /^\/api\/v1\/me$/, (s) => profile(s)],

  [
    'GET',
    /^\/api\/v1\/cert$/,
    (s) => {
      settleCert(s);
      return { certStatus: s.user.certStatus, identityType: s.user.identityType, latest: s.user.submittedAt ? { status: s.user.certStatus, rejectReason: null } : null };
    },
  ],
  ['POST', /^\/api\/v1\/cert\/upload-sign$/, () => ({ demo: true })],
  [
    'POST',
    /^\/api\/v1\/cert\/submit$/,
    (s, d) => {
      if (s.user.certStatus === 'PENDING' || s.user.certStatus === 'APPROVED') fail(ErrorCode.CERT_STATE_INVALID, '当前状态不能重复提交');
      if (!String(d.licenseNo ?? '').trim()) fail(ErrorCode.BAD_REQUEST, '请填写执业证号 / 资格证号');
      if (!String(d.organization ?? '').trim()) fail(ErrorCode.BAD_REQUEST, '请填写所在医院 / 机构');
      s.user.identityType = d.identityType as IdentityType;
      s.user.nickname = String(d.realName || '演示学员');
      s.user.certStatus = 'PENDING';
      s.user.submittedAt = Date.now();
      return { id: nextId(s, 'cert') };
    },
  ],

  [
    'GET',
    /^\/api\/v1\/home$/,
    (s) => {
      const identity = requireCert(s);
      return {
        banners: BANNERS.filter((b) => (b.visibleTo as string[]).includes(identity)).map(({ id, title, image, link }) => ({ id, title, image, link })),
        sections: HOME_SECTIONS[identity].map((sec) => ({
          title: sec.title,
          products: sec.productIds.map(findProduct).filter((p) => p.visibleTo.includes(identity)).map((p) => card(s, p)),
        })),
      };
    },
  ],
  ['GET', /^\/api\/v1\/site\/join$/, () => JOIN_PAGE],
  ['GET', /^\/api\/v1\/categories$/, (s) => (requireCert(s), CATEGORIES)],
  [
    'GET',
    /^\/api\/v1\/products$/,
    (s, d) => {
      const identity = requireCert(s);
      const cat = d.categoryId as string | undefined;
      const ids = cat ? [cat, ...(CATEGORIES.find((c) => c.id === cat)?.children.map((c) => c.id) ?? [])] : null;
      const list = visibleProducts(identity)
        .filter((p) => !ids || ids.includes(p.categoryId))
        .map((p) => card(s, p));
      return { list, total: list.length, page: 1, pageSize: list.length };
    },
  ],
  [
    'GET',
    /^\/api\/v1\/products\/([\w-]+)$/,
    (s, _d, [id]) => {
      const identity = requireCert(s);
      const p = findProduct(id);
      if (!p.visibleTo.includes(identity)) fail(ErrorCode.CONTENT_NOT_VISIBLE, '该课程暂未对你的身份开放', 403);
      return {
        ...card(s, p),
        detailHtml: p.detailHtml,
        owned: owns(s, p),
        chapters: p.chapters.map((ch) => ({ id: ch.id, title: ch.title, lessons: ch.lessons.map(({ contentHtml: _c, ...l }) => l) })),
        items: (p.items ?? []).map(findProduct).map((x) => ({ id: x.id, title: x.title, cover: x.cover, type: x.type })),
      };
    },
  ],

  [
    'GET',
    /^\/api\/v1\/lessons\/([\w-]+)\/play-sign$/,
    (s, _d, [lessonId]) => {
      requireCert(s);
      const { product, lesson } = findLesson(lessonId);
      const full = owns(s, product);
      if (!full && !lesson.isTrial) fail(ErrorCode.CONTENT_NOT_PURCHASED, '购买后即可学习', 403);
      return {
        lessonId,
        type: lesson.type,
        access: full || !lesson.trialSeconds ? { mode: 'FULL' } : { mode: 'TRIAL', trialSeconds: lesson.trialSeconds },
        resumeAt: s.progress[lessonId]?.position ?? 0,
        fileId: null,
        psign: null,
        contentHtml: lesson.contentHtml ?? null,
      };
    },
  ],
  [
    'POST',
    /^\/api\/v1\/progress$/,
    (s, d) => {
      const { lesson } = findLesson(String(d.lessonId));
      const position = Number(d.position) || 0;
      const completed = lesson.type === 'ARTICLE' || (lesson.duration > 0 && position >= lesson.duration * 0.9);
      const prev = s.progress[lesson.id];
      s.progress[lesson.id] = { position, completed: completed || !!prev?.completed, at: Date.now() };
      return { completed: s.progress[lesson.id].completed };
    },
  ],
  [
    'GET',
    /^\/api\/v1\/learning\/courses$/,
    (s) => {
      const identity = requireCert(s);
      return visibleProducts(identity)
        .filter((p) => p.type !== 'OFFLINE' && p.chapters.length && owns(s, p))
        .map((p) => {
          const lessons = p.chapters.flatMap((ch) => ch.lessons);
          const done = lessons.filter((l) => s.progress[l.id]?.completed).length;
          const last = lessons.filter((l) => s.progress[l.id]).sort((a, b) => s.progress[b.id].at - s.progress[a.id].at)[0];
          return { id: p.id, title: p.title, cover: p.cover, lessonCount: lessons.length, completedCount: done, progress: lessons.length ? Math.round((done / lessons.length) * 100) : 0, lastLessonId: last?.id ?? null, _at: last ? s.progress[last.id].at : 0 };
        })
        .sort((a, b) => b._at - a._at)
        .map(({ _at, ...c }) => c);
    },
  ],

  [
    'GET',
    /^\/api\/v1\/orders\/preview$/,
    (s, d) => {
      requireCert(s);
      const p = findProduct(String(d.productId));
      const rule = activeRule(s, p);
      const total = rule ? rule.priceCent : p.priceCent;
      const coupons = s.coupons
        .filter((uc) => uc.status === 'UNUSED' && couponValidTo(s, uc) > Date.now())
        .map((uc) => {
          const c = couponDef(uc.couponId);
          const reason = couponProblem(uc, p, total);
          const { discountCent: _f, ...view } = couponView(s, uc);
          return { ...view, userCouponId: uc.id, faceCent: c.discountCent, discountCent: reason ? 0 : Math.min(c.discountCent, total), reason };
        })
        .sort((a, b) => b.discountCent - a.discountCent);
      const best = coupons.find((c) => !c.reason && c.discountCent > 0);
      return {
        productId: p.id,
        title: p.title,
        originCent: p.priceCent,
        totalCent: total,
        priceRule: rule ? { type: rule.type, priceCent: rule.priceCent, endAt: iso(rule.endAt) } : null,
        bestUserCouponId: best?.userCouponId ?? null,
        pricePrefix: p.pricePrefix ?? null,
        coupons,
      };
    },
  ],
  [
    'POST',
    /^\/api\/v1\/orders$/,
    (s, d) => {
      requireCert(s);
      closeExpired(s);
      const p = findProduct(String(d.productId));
      if (owns(s, p)) fail(ErrorCode.ORDER_STATE_INVALID, '你已拥有该课程');
      const pending = s.orders.find((o) => o.productId === p.id && o.purpose === 'PRODUCT' && o.status === 'CREATED');
      if (pending) {
        pending.status = 'CANCELLED';
        releaseCoupon(s, pending);
      }
      const rule = activeRule(s, p);
      const total = rule ? rule.priceCent : p.priceCent;
      let cut = 0;
      let ucId: string | null = null;
      if (d.userCouponId) {
        const uc = s.coupons.find((x) => x.id === d.userCouponId && x.status === 'UNUSED');
        if (!uc) fail(ErrorCode.BAD_REQUEST, '优惠券不可用');
        const problem = couponProblem(uc!, p, total);
        if (problem) fail(ErrorCode.BAD_REQUEST, problem);
        cut = Math.min(couponDef(uc!.couponId).discountCent, total);
        uc!.status = 'LOCKED';
        ucId = uc!.id;
      }
      const o = newOrder(s, { purpose: 'PRODUCT', productId: p.id, title: p.title, totalCent: total, payCent: total - cut, userCouponId: ucId, enrollmentId: null });
      return { orderNo: o.orderNo, payCent: o.payCent };
    },
  ],
  [
    'POST',
    /^\/api\/v1\/orders\/(\w+)\/cancel$/,
    (s, _d, [no]) => {
      const o = s.orders.find((x) => x.orderNo === no) ?? fail(ErrorCode.NOT_FOUND, '订单不存在', 404);
      if (o.status !== 'CREATED') fail(ErrorCode.ORDER_STATE_INVALID, '订单状态已变化');
      o.status = 'CANCELLED';
      releaseCoupon(s, o);
      const e = s.enrollments.find((x) => x.depositOrderNo === o.orderNo && x.status === 'DEPOSIT_PENDING');
      if (e) {
        e.status = 'CANCELLED';
        e.cancelReason = '已取消支付，名额已释放';
      }
      return { orderNo: o.orderNo };
    },
  ],
  [
    'POST',
    /^\/api\/v1\/orders\/(\w+)\/pay$/,
    (s, _d, [no]) => {
      closeExpired(s);
      const o = s.orders.find((x) => x.orderNo === no) ?? fail(ErrorCode.NOT_FOUND, '订单不存在', 404);
      if (o.status !== 'CREATED') fail(ErrorCode.ORDER_STATE_INVALID, '订单已关闭，请重新下单');
      markPaid(s, o);
      return { mock: true };
    },
  ],
  [
    'GET',
    /^\/api\/v1\/orders$/,
    (s) => {
      closeExpired(s);
      const list = s.orders.map((o) => ({
        orderNo: o.orderNo,
        status: o.status,
        payCent: o.payCent,
        refundedCent: 0,
        createdAt: iso(o.createdAt),
        items: [{ title: o.purpose === 'PRODUCT' ? o.title : `${o.title}（${o.purpose === 'OFFLINE_DEPOSIT' ? '定金' : '尾款'}）` }],
      }));
      return { list, total: list.length, page: 1, pageSize: 50 };
    },
  ],

  [
    'GET',
    /^\/api\/v1\/coupons\/center$/,
    (s) =>
      COUPONS.map((c) => {
        const held = s.coupons.filter((x) => x.couponId === c.id).length;
        const reason = c.soldOut ? '已抢光' : held >= c.perUser ? `每人限领 ${c.perUser} 张` : null;
        return {
          id: c.id,
          name: c.name,
          description: c.description,
          type: c.type,
          thresholdCent: c.thresholdCent,
          discountCent: c.discountCent,
          scope: c.scope,
          validFrom: iso(s.t0),
          validTo: iso(Date.now() + 30 * 86_400_000),
          heldCount: held,
          soldOut: c.soldOut,
          claimable: !reason,
          reason,
        };
      }),
  ],
  [
    'POST',
    /^\/api\/v1\/coupons\/([\w-]+)\/claim$/,
    (s, _d, [id]) => {
      const c = COUPONS.find((x) => x.id === id) ?? fail(ErrorCode.NOT_FOUND, '优惠券不存在', 404);
      if (c.soldOut) fail(ErrorCode.BAD_REQUEST, '已抢光');
      if (s.coupons.filter((x) => x.couponId === id).length >= c.perUser) fail(ErrorCode.BAD_REQUEST, `每人限领 ${c.perUser} 张`);
      const uc: UserCoupon = { id: nextId(s, 'uc'), couponId: id, status: 'UNUSED', claimedAt: Date.now(), usedAt: null };
      s.coupons.unshift(uc);
      return { id: uc.id };
    },
  ],
  [
    'GET',
    /^\/api\/v1\/me\/coupons$/,
    (s, d) => {
      const tab = d.tab as string;
      return s.coupons
        .filter((uc) => (tab === 'used' ? uc.status === 'USED' : tab === 'expired' ? uc.status === 'EXPIRED' : uc.status === 'UNUSED' || uc.status === 'LOCKED'))
        .map((uc) => ({ ...couponView(s, uc), id: uc.id, status: uc.status, scope: couponDef(uc.couponId).scope, validFrom: iso(uc.claimedAt), usedAt: uc.usedAt ? iso(uc.usedAt) : null }));
    },
  ],

  [
    'GET',
    /^\/api\/v1\/offline\/products\/([\w-]+)\/sessions$/,
    (s, _d, [id]) => {
      requireCert(s);
      closeExpired(s);
      const p = findProduct(id);
      return sessionsOf(s, p).map((x) => {
        const mine = s.enrollments.filter((e) => e.sessionId === x.id && ACTIVE.includes(e.status));
        const remaining = Math.max(0, x.quota - x.taken - mine.length);
        return {
          id: x.id,
          title: x.title,
          startAt: iso(x.startAt),
          endAt: iso(x.endAt),
          address: x.address,
          depositCent: x.depositCent,
          balanceCent: x.balanceCent,
          balanceDueAt: iso(x.balanceDueAt),
          quota: x.quota,
          remaining,
          closed: remaining === 0 || Date.now() >= x.balanceDueAt,
          pricePrefix: x.pricePrefix ?? null,
          myEnrollment: mine[0] ? { id: mine[0].id, status: mine[0].status } : null,
        };
      });
    },
  ],
  [
    'POST',
    /^\/api\/v1\/offline\/sessions\/([\w-]+)\/enroll$/,
    (s, d, [sessionId]) => {
      requireCert(s);
      closeExpired(s);
      const p = PRODUCTS.find((x) => x.sessions?.some((v) => v.id === sessionId)) ?? fail(ErrorCode.NOT_FOUND, '场次不存在', 404);
      const x = sessionsOf(s, p).find((v) => v.id === sessionId)!;
      const active = s.enrollments.filter((e) => e.sessionId === sessionId && ACTIVE.includes(e.status));
      if (active.length) fail(ErrorCode.BAD_REQUEST, '你已报名该场次');
      if (x.quota - x.taken - active.length <= 0) fail(ErrorCode.BAD_REQUEST, '该场次名额已满');
      const phone = String(d.phone ?? '');
      const e: Enrollment = {
        id: nextId(s, 'en'),
        sessionId,
        productId: p.id,
        status: 'DEPOSIT_PENDING',
        contactName: String(d.name ?? ''),
        contactPhoneMasked: phone.length >= 7 ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : phone,
        cancelReason: null,
        createdAt: Date.now(),
        depositOrderNo: '',
        balanceOrderNo: null,
      };
      const o = newOrder(s, { purpose: 'OFFLINE_DEPOSIT', productId: p.id, title: `${p.title} · ${x.title}`, totalCent: x.depositCent, payCent: x.depositCent, userCouponId: null, enrollmentId: e.id });
      e.depositOrderNo = o.orderNo;
      s.enrollments.unshift(e);
      return { enrollmentId: e.id, orderNo: o.orderNo, payCent: o.payCent };
    },
  ],
  [
    'POST',
    /^\/api\/v1\/offline\/enrollments\/(\w+)\/balance$/,
    (s, _d, [id]) => {
      const e = s.enrollments.find((x) => x.id === id) ?? fail(ErrorCode.NOT_FOUND, '报名不存在', 404);
      if (e.status !== 'DEPOSIT_PAID') fail(ErrorCode.ORDER_STATE_INVALID, '当前状态不能支付尾款');
      const p = findProduct(e.productId);
      const x = sessionsOf(s, p).find((v) => v.id === e.sessionId)!;
      const pending = s.orders.find((o) => o.orderNo === e.balanceOrderNo && o.status === 'CREATED');
      const o = pending ?? newOrder(s, { purpose: 'OFFLINE_BALANCE', productId: p.id, title: `${p.title} · ${x.title}`, totalCent: x.balanceCent, payCent: x.balanceCent, userCouponId: null, enrollmentId: e.id });
      e.balanceOrderNo = o.orderNo;
      return { orderNo: o.orderNo, payCent: o.payCent };
    },
  ],
  [
    'POST',
    /^\/api\/v1\/offline\/enrollments\/(\w+)\/cancel$/,
    (s, _d, [id]) => {
      const e = s.enrollments.find((x) => x.id === id) ?? fail(ErrorCode.NOT_FOUND, '报名不存在', 404);
      if (e.status !== 'DEPOSIT_PENDING') fail(ErrorCode.ORDER_STATE_INVALID, '已付定金的报名请联系工作人员取消');
      e.status = 'CANCELLED';
      e.cancelReason = '已取消报名';
      const o = s.orders.find((x) => x.orderNo === e.depositOrderNo && x.status === 'CREATED');
      if (o) o.status = 'CANCELLED';
      return true;
    },
  ],
  [
    'GET',
    /^\/api\/v1\/offline\/enrollments$/,
    (s) => {
      closeExpired(s);
      return s.enrollments.map((e) => enrollmentView(s, e));
    },
  ],

  [
    'POST',
    /^\/api\/v1\/leads$/,
    (s, d) => {
      if (!String(d.name ?? '').trim()) fail(ErrorCode.BAD_REQUEST, '请填写姓名');
      if (!/^1\d{10}$/.test(String(d.phone ?? ''))) fail(ErrorCode.BAD_REQUEST, '请填写正确的手机号');
      s.leads += 1;
      return { id: nextId(s, 'lead') };
    },
  ],
];

/** 模拟一次接口调用：成功返回 data，失败抛出 { code, message, status } */
export async function mockRequest(method: string, url: string, data: Data = {}): Promise<unknown> {
  await new Promise((r) => setTimeout(r, 120 + Math.random() * 180));
  const s = load();
  for (const [m, re, handler] of routes) {
    if (m !== method) continue;
    const match = re.exec(url);
    if (!match) continue;
    const result = handler(s, data, match.slice(1));
    save();
    return JSON.parse(JSON.stringify(result));
  }
  return fail(ErrorCode.NOT_IMPLEMENTED, '演示版暂不支持该操作', 501);
}

export { MockError };
