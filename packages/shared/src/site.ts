/**
 * 运营配置（SiteConfig）结构。后端校验、后台编辑、小程序渲染共用。
 */
import type { IdentityType } from './enums';

/** Banner 位置 */
export const BannerPosition = {
  HOME_TOP: 'HOME_TOP',
} as const;
export type BannerPosition = (typeof BannerPosition)[keyof typeof BannerPosition];

export const BannerPositionLabel: Record<BannerPosition, string> = {
  HOME_TOP: '首页顶部轮播',
};

/** Banner / 运营位可跳转的小程序页面（只允许站内跳转） */
export const LINKABLE_PAGES = [
  { path: '/pages/course/detail', label: '课程详情', param: 'id' },
  { path: '/pages/course/list', label: '课程列表', tab: true },
  { path: '/pages/coupon/center', label: '领券中心' },
  { path: '/pages/join/index', label: '合作（从业者）' },
  { path: '/pages/learning/index', label: '学习中心', tab: true },
  { path: '/pages/mine/index', label: '我的', tab: true },
] as const;

/** 站内链接校验：/pages/xxx 或 /pages/xxx?id=yyy，返回问题描述，合法返回 null */
export function linkProblem(link: string | null | undefined): string | null {
  if (!link) return null;
  const [path, query] = link.split('?');
  const page = LINKABLE_PAGES.find((p) => p.path === path);
  if (!page) return '只能跳转到小程序内的指定页面';
  if ('param' in page) {
    const m = new RegExp(`^${page.param}=[\\w-]{1,64}$`).exec(query ?? '');
    if (!m) return `${page.label}需要指定 ${page.param}`;
  } else if (query) {
    return `${page.label}不支持参数`;
  }
  return null;
}

/** 是否为 tabBar 页面（需用 switchTab 跳转） */
export function isTabPage(link: string): boolean {
  const path = link.split('?')[0];
  return LINKABLE_PAGES.some((p) => p.path === path && 'tab' in p && p.tab);
}

// ───────── 首页推荐 ─────────

export interface HomeSection {
  title: string;
  productIds: string[];
}

export interface HomeSlotsConfig {
  sections: HomeSection[];
}

export const homeSlotsKey = (identity: IdentityType) => `home_slots:${identity}`;

// ───────── 招商页 ─────────

export interface JoinPageConfig {
  hero: { title: string; subtitle: string; image: string | null };
  benefits: { title: string; desc: string }[];
  cases: { title: string; desc: string; image: string | null }[];
  faqs: { q: string; a: string }[];
  formTitle: string;
  submitText: string;
  /** 提交成功提示 */
  successText: string;
}

export const JOIN_PAGE_KEY = 'join_page';

export const DEFAULT_JOIN_PAGE: JoinPageConfig = {
  hero: { title: '成为逻辑解剖合作伙伴', subtitle: '留下联系方式，我们的顾问会尽快与你联系', image: null },
  benefits: [],
  cases: [],
  faqs: [],
  formTitle: '留下联系方式',
  submitText: '提交',
  successText: '我们会在 1~2 个工作日内与你联系',
};
