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

// ───────── 关于我们（公司 + 创始人） ─────────

export interface AboutPageConfig {
  brand: { name: string; slogan: string };
  /** 引文（如《文子·道原》） */
  quote: { text: string; source: string };
  company: { title: string; paragraphs: string[] };
  founder: { name: string; title: string; photo: string | null; tags: string[]; bio: string };
  stats: { value: string; label: string }[];
}

export const ABOUT_PAGE_KEY = 'about_page';

export const DEFAULT_ABOUT_PAGE: AboutPageConfig = {
  brand: { name: '析芒教育 · 逻辑解剖', slogan: '以解剖立学，以临床立教' },
  quote: {
    text: '夫道者陶冶万物，终始无形，寂然不动。大通混冥。深闳广大，不可为外，析毫剖芒，不可为内。无环堵之宇，而生有无之总名也。',
    source: '《文子·道原》',
  },
  company: {
    title: '析芒教育 · 逻辑解剖',
    paragraphs: [
      '析芒，取自《文子·道原》中「析毫剖芒」，意为分割剖析毫毛芒刺，形容剖析细微透彻。',
      '逻辑解剖作为一种教学理念，核心目标是深化医美行业对面颈部解剖学的理解与应用，从而提高治疗的安全性和有效性。析芒教育一直以来坚持的面部精细解剖与之相契合，也是逻辑解剖理念的基石。',
    ],
  },
  founder: {
    name: '吴宇萌',
    title: '逻辑解剖理念创始人',
    photo: null,
    tags: ['析芒教育咨询有限公司 CEO', '整形外科主诊医师', '面颈部解剖讲师', '十年解剖教学深耕'],
    bio: '',
  },
  stats: [
    { value: '400+', label: '线上解剖课分享' },
    { value: '500+', label: '解剖现场演讲' },
    { value: '600+', label: '标本精细解剖' },
    { value: '万例', label: '临床案例经验' },
  ],
};

// ───────── 课程顾问（详情页引导加微信） ─────────

export interface ConsultConfig {
  enabled: boolean;
  title: string;
  desc: string;
  wechatId: string;
  /** 顾问企业微信 / 个人微信二维码图片地址，小程序内长按识别 */
  qrImage: string | null;
}

export const CONSULT_KEY = 'consult';

export const DEFAULT_CONSULT: ConsultConfig = {
  enabled: true,
  title: '添加课程顾问微信',
  desc: '获取课程资料、开课提醒与报名咨询',
  wechatId: '',
  qrImage: null,
};
