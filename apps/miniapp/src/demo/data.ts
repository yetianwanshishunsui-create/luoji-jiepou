/**
 * 演示版数据（VITE_DEMO=true 时使用）。
 * 课程体系按析芒教育「逻辑解剖」品牌资料梳理：线下精品课（四大主题）、线上精品课（五大系列）、公益讲堂。
 * 课程名称取自品牌资料与现有小鹅通店铺；场次、部分价格、文章与音频正文为演示占位，正式内容由管理后台录入。
 */
import type { IdentityType, JoinPageConfig, ProductType } from '@luoji/shared';

const DAY = 86_400_000;
const HOUR = 3_600_000;

type Theme = 'blue' | 'navy' | 'amber' | 'crimson' | 'teal';

const THEMES: Record<Theme, { bg: [string, string]; title: string; sub: string; mark: string; tag: string }> = {
  blue: { bg: ['#f3f7ff', '#cfdcf7'], title: '#1b3f9e', sub: '#45577f', mark: '#2a5bd7', tag: '#2a5bd7' },
  navy: { bg: ['#1b3f9e', '#0f2559'], title: '#ffffff', sub: '#c9d6f5', mark: '#8fb0ff', tag: '#3b6fe0' },
  amber: { bg: ['#fff8ec', '#f3d9ad'], title: '#5a3304', sub: '#7a5520', mark: '#c26a12', tag: '#b45309' },
  crimson: { bg: ['#f6f3ff', '#d9d3f5'], title: '#2b1d7a', sub: '#4f4683', mark: '#c0262d', tag: '#c0262d' },
  teal: { bg: ['#e9f7fb', '#bfe3ee'], title: '#0b4a5c', sub: '#2d6474', mark: '#0e7490', tag: '#0e7490' },
};

/**
 * 生成品牌风格的占位封面（SVG data URI），版式参考现有课程海报：
 * 左上角「逻辑解剖」字标，大标题靠左，右下角标签。
 */
function art(lines: string[], sub: string, theme: Theme = 'blue', tag = '', w = 480, h = 320): string {
  const t = THEMES[theme];
  const font = 'PingFang SC,Microsoft YaHei,sans-serif';
  const size = Math.min(h * 0.13, (w * 0.84) / Math.max(...lines.map((l) => l.length)));
  const top = h * 0.5 - ((lines.length - 1) * size * 1.2) / 2;
  const titles = lines
    .map((l, i) => `<text x="${w * 0.08}" y="${top + i * size * 1.2}" font-family="${font}" font-size="${size}" font-weight="800" font-style="italic" fill="${t.title}">${l}</text>`)
    .join('');
  const tagEl = tag
    ? `<rect x="${w - 18 - tag.length * h * 0.055 - 16}" y="${h - 46}" width="${tag.length * h * 0.055 + 16}" height="${h * 0.09}" rx="${h * 0.02}" fill="${t.tag}"/><text x="${w - 18 - 8}" y="${h - 46 + h * 0.065}" text-anchor="end" font-family="${font}" font-size="${h * 0.055}" fill="#fff">${tag}</text>`
    : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.bg[0]}"/><stop offset="1" stop-color="${t.bg[1]}"/></linearGradient></defs>
<rect width="${w}" height="${h}" fill="url(#g)"/>
<circle cx="${w * 0.92}" cy="${h * 0.12}" r="${h * 0.42}" fill="#fff" fill-opacity="0.18"/>
<path d="M0 ${h * 0.86} Q ${w * 0.45} ${h * 0.7} ${w} ${h * 0.92} L ${w} ${h} L 0 ${h} Z" fill="#fff" fill-opacity="0.16"/>
<text x="${w * 0.08}" y="${h * 0.17}" font-family="${font}" font-size="${h * 0.07}" font-weight="800" font-style="italic" fill="${t.mark}">逻辑解剖</text>
${titles}
<text x="${w * 0.08}" y="${top + (lines.length - 1) * size * 1.2 + h * 0.14}" font-family="${font}" font-size="${h * 0.06}" fill="${t.sub}">${sub}</text>
${tagEl}
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export interface DemoLesson {
  id: string;
  type: 'VIDEO' | 'AUDIO' | 'ARTICLE';
  title: string;
  duration: number;
  isTrial: boolean;
  trialSeconds: number;
  contentHtml?: string;
}

export interface DemoSession {
  id: string;
  title: string;
  /** 相对演示开始当天的偏移（毫秒） */
  startIn: number;
  days: number;
  address: string;
  depositCent: number;
  balanceCent: number;
  balanceDueIn: number;
  quota: number;
  /** 演示开始时已被其他学员占用的名额 */
  taken: number;
  /** 价格为拟定（品牌资料中没有）时标注「虚拟」 */
  pricePrefix?: string;
}

export interface DemoProduct {
  id: string;
  type: ProductType;
  title: string;
  subtitle: string;
  cover: string;
  categoryId: string;
  visibleTo: IdentityType[];
  pricingMode: 'FREE' | 'PAID';
  priceCent: number;
  /** 早鸟 / 限时价：相对演示开始时间结束 */
  rule?: { type: 'EARLY_BIRD' | 'LIMITED_TIME'; priceCent: number; endIn: number };
  detailHtml: string;
  chapters: { id: string; title: string; lessons: DemoLesson[] }[];
  /** 专栏 / 系列包含的课程 */
  items?: string[];
  sessions?: DemoSession[];
  /** 价格为拟定（品牌资料中没有）时标注「虚拟」 */
  pricePrefix?: string;
}

const BOTH: IdentityType[] = ['DOCTOR', 'PRACTITIONER'];
/** 品牌资料中没有、由我方拟定的价格，显示为「虚拟¥xxx」 */
const V = '虚拟';

const p = (text: string) => `<p style="line-height:1.8;margin:0 0 12px">${text}</p>`;
const h = (text: string) => `<p style="font-weight:600;margin:16px 0 8px">${text}</p>`;
const ul = (items: string[]) => `<ul style="padding-left:20px;margin:0 0 12px">${items.map((i) => `<li style="line-height:1.8">${i}</li>`).join('')}</ul>`;
const demoNote = p('<span style="color:#6b7385">（演示内容，正式课程介绍由运营在管理后台编辑）</span>');

const placeholderArticle = (title: string) =>
  `<h3 style="margin:0 0 12px">${title}</h3>` +
  p('本文为演示占位，正式内容同步自「逻辑解剖云学苑」公众号文章，由运营在管理后台以图文课时发布。') +
  p('图文课时支持标题、正文、图片与重点标注，认证用户可免费阅读。');

// ───────── 分类：一级三大板块，二级为主题 / 系列 / 专区 ─────────

export const CATEGORIES = [
  {
    id: 'c-offline',
    name: '线下精品课',
    children: [
      { id: 'c-off-core', name: '核心框架课' },
      { id: 'c-off-clinic', name: '临床转化课' },
      { id: 'c-off-risk', name: '风险应急课' },
      { id: 'c-off-vessel', name: '血管安全专项' },
    ],
  },
  {
    id: 'c-online',
    name: '线上精品课',
    children: [
      { id: 'c-on-collagen', name: '胶原蛋白专区' },
      { id: 'c-on-ha', name: '玻尿酸专区' },
      { id: 'c-on-smas', name: '肉毒素 · SMAS' },
      { id: 'c-on-face', name: '面部精细解剖' },
      { id: 'c-on-live', name: '专题直播回放' },
    ],
  },
  {
    id: 'c-free',
    name: '公益讲堂',
    children: [
      { id: 'c-free-60', name: '每日 60 秒' },
      { id: 'c-free-yxy', name: '云学苑' },
    ],
  },
];

// ───────── 直播回放（单节 ¥99） ─────────

const replay = (id: string, zone: string, lines: string[], title: string, theme: Theme, trial = 0, visibleTo = BOTH): DemoProduct => ({
  id,
  type: 'COURSE',
  title,
  subtitle: `${zone} · 直播回放`,
  cover: art(lines, zone, theme, '直播'),
  categoryId: id.startsWith('r-col') ? 'c-on-collagen' : id.startsWith('r-ha') ? 'c-on-ha' : 'c-on-live',
  visibleTo,
  pricingMode: 'PAID',
  priceCent: 9900,
  detailHtml: h('课程介绍') + p(`本节为吴宇萌院长「${zone}」直播回放，购买后可反复观看。`) + demoNote,
  chapters: [
    {
      id: `${id}-ch`,
      title: '直播回放',
      lessons: [{ id: `${id}-l1`, type: 'VIDEO', title, duration: 3600 + (id.length % 5) * 420, isTrial: trial > 0, trialSeconds: trial }],
    },
  ],
});

const REPLAYS: DemoProduct[] = [
  // 胶原蛋白专区
  replay('r-col-1', '胶原蛋白专区', ['面部层次与', '胶原注射的底层逻辑'], '面部层次与胶原注射的底层逻辑', 'blue', 180),
  replay('r-col-2', '胶原蛋白专区', ['眶周逻辑解剖', '胶原精准注射与安全边界'], '眶周逻辑解剖：胶原蛋白的精准注射与安全边界', 'blue'),
  replay('r-col-3', '胶原蛋白专区', ['胶原+玻尿酸/肉毒', '联合治疗黄金法则'], '胶原+玻尿酸/肉毒：联合治疗黄金法则', 'blue'),
  replay('r-col-4', '胶原蛋白专区', ['胶原产品在面部', '年轻化中的精准定位'], '胶原产品在面部年轻化中的精准定位', 'blue'),
  // 玻尿酸专区
  replay('r-ha-1', '玻尿酸专区', ['玻尿酸注射并发症', '的预防与处理逻辑'], '玻尿酸注射并发症的预防与处理逻辑', 'blue', 180),
  replay('r-ha-2', '玻尿酸专区', ['鼻唇沟与唇部', '玻尿酸填充的力学逻辑'], '鼻唇沟与唇部：玻尿酸填充的力学逻辑', 'blue'),
  replay('r-ha-3', '玻尿酸专区', ['中面部逻辑解剖', '容量重塑与韧带支撑'], '中面部逻辑解剖：玻尿酸容量重塑与韧带支撑', 'blue'),
  replay('r-ha-4', '玻尿酸专区', ['面部层次与', '玻尿酸注射的底层逻辑'], '面部层次与玻尿酸注射的底层逻辑', 'blue'),
  // 驾驭血管的艺术 / 泛眼周 / 泛口周专区
  replay('r-v1', '驾驭血管的艺术专区', ['驾驭血管的艺术', '眉间与口周解剖差异'], '驾驭血管的艺术：眉间与口周解剖规律差异化在注射中的应用技巧', 'crimson', 180),
  replay('r-v2', '驾驭血管的艺术专区', ['驾驭血管的艺术', '面颊与颞区注射专题'], '驾驭血管的艺术：面颊与颞区注射专题', 'crimson'),
  replay('r-v3', '驾驭血管的艺术专区', ['驾驭血管的艺术', '鼻部注射专题'], '驾驭血管的艺术：鼻部注射专题', 'crimson'),
  replay('r-m1', '泛口周专区', ['结构变化如何决定', '泛口周的注射手感'], '结构变化如何决定泛口周的注射手感？', 'teal', 180),
  replay('r-e1', '泛眼周专区', ['仅知道血管', '就能打好眉间注射吗'], '仅知道血管就能打好眉间注射吗？', 'teal'),
  replay('r-e2', '泛眼周专区', ['眉部注射怎样', '不痛且效果明显'], '眉部注射怎样不痛且效果明显？', 'teal'),
  replay('r-e3', '泛眼周专区', ['学注射，为什么', '要从打额头开始'], '学注射，为什么要从打额头开始？', 'teal'),
];

// ───────── 课程 ─────────

export const PRODUCTS: DemoProduct[] = [
  // ── 线下精品课：四大主题 ──
  {
    id: 'o-dissect',
    type: 'OFFLINE',
    title: '逻辑解剖 · 精准解剖实操课（注射解剖闭门研习会）',
    subtitle: '核心框架课 · 1 天理论 + 1 天标本实操',
    cover: art(['精准解剖实操课', '注射解剖闭门研习会'], '知道 · 用到 · 悟到', 'blue', '2天线下'),
    categoryId: 'c-off-core',
    visibleTo: BOTH,
    pricingMode: 'PAID',
    priceCent: 0,
    detailHtml:
      h('课程定位：核心框架课') +
      p('以面颈部标本精细解剖为线索，从结构、功能、临床三重视角重新解读解剖与临床应用的关系，重点建立可复用的解剖逻辑。') +
      p('特点是“先看懂，再谈操作”，偏基础、偏系统、偏认知，是其他课程的地基。') +
      h('课程形式') +
      ul(['第 1 天：理论精讲', '第 2 天：标本实操（小班分组）']) +
      demoNote,
    chapters: [],
    sessions: [
      { id: 's-dis-bj', title: '北京场', startIn: 33 * DAY, days: 2, address: '北京市（具体地址报名后通知）', depositCent: 500000, balanceCent: 780000, balanceDueIn: 26 * DAY, quota: 30, taken: 22 },
      { id: 's-dis-sh', title: '上海场', startIn: 61 * DAY, days: 2, address: '上海市（具体地址报名后通知）', depositCent: 500000, balanceCent: 780000, balanceDueIn: 54 * DAY, quota: 30, taken: 30 },
    ],
  },
  {
    id: 'o-inject',
    type: 'OFFLINE',
    title: '“注射在左、解剖在右”注射解剖对照课',
    subtitle: '临床转化课 · 1 天理论 + 1 天真人模特实操',
    cover: art(['注射在左', '解剖在右'], '注射解剖对照课', 'crimson', '2天线下'),
    categoryId: 'c-off-clinic',
    visibleTo: BOTH,
    pricingMode: 'PAID',
    priceCent: 0,
    detailHtml:
      h('课程定位：临床转化课') +
      p('把解剖与注射相互对照，讲清层次、路径、点位与风险的关系，让解剖认知落到实际注射决策。') +
      p('特点是左右互参、知行对照，区别于纯解剖课，重点在临床转化与操作判断。') +
      h('课程形式') +
      ul(['第 1 天：理论精讲', '第 2 天：真人模特实操']) +
      demoNote,
    chapters: [],
    sessions: [
      { id: 's-inj-gz', title: '广州场', startIn: 40 * DAY, days: 2, address: '广州市（具体地址报名后通知）', depositCent: 300000, balanceCent: 680000, balanceDueIn: 33 * DAY, quota: 24, taken: 16, pricePrefix: V },
      { id: 's-inj-cd', title: '成都场', startIn: 68 * DAY, days: 2, address: '成都市（具体地址报名后通知）', depositCent: 300000, balanceCent: 680000, balanceDueIn: 61 * DAY, quota: 24, taken: 9, pricePrefix: V },
    ],
  },
  {
    id: 'o-rescue',
    type: 'OFFLINE',
    title: '逻辑解剖 · “救”在眼前 并发症专题课',
    subtitle: '风险应急课 · 单天理论 · 每 1 针的风险',
    cover: art(['“救”在眼前'], '每 1 针的风险 · 并发症专题', 'navy', '早鸟价'),
    categoryId: 'c-off-risk',
    visibleTo: BOTH,
    pricingMode: 'PAID',
    priceCent: 0,
    detailHtml:
      h('课程定位：风险应急课') +
      p('围绕并发症的识别、判断、处理与复盘展开，训练关键时刻的应对路径。') +
      p('特点是补足操作之后的安全能力，与解剖课形成“预防—应急”的互补。') +
      h('课程形式') +
      ul(['单天理论', '早鸟价 ¥4680（场次内一次付清）']) +
      demoNote,
    chapters: [],
    sessions: [
      { id: 's-res-bj', title: '北京专场（早鸟价）', startIn: 21 * DAY, days: 1, address: '北京市（具体地址报名后通知）', depositCent: 468000, balanceCent: 0, balanceDueIn: 14 * DAY, quota: 200, taken: 163 },
      { id: 's-res-hz', title: '杭州专场', startIn: 52 * DAY, days: 1, address: '杭州市（具体地址报名后通知）', depositCent: 498000, balanceCent: 0, balanceDueIn: 45 * DAY, quota: 150, taken: 41, pricePrefix: V },
    ],
  },
  {
    id: 'o-vessel',
    type: 'OFFLINE',
    title: '逻辑解剖 · “驾驭血管的艺术”血管专题课',
    subtitle: '血管安全专项课 · 单天理论',
    cover: art(['驾驭血管的艺术'], '血管安全专项课', 'crimson', '单天理论'),
    categoryId: 'c-off-vessel',
    visibleTo: BOTH,
    pricingMode: 'PAID',
    priceCent: 0,
    detailHtml:
      h('课程定位：血管安全专项课') +
      p('聚焦面颈部血管走行、层次、危险区与栓塞风险，把血管知识转成操作中的安全边界。') +
      p('特点是更专项、更前置，重点解决“如何预判和避开血管风险”。') +
      demoNote,
    chapters: [],
    sessions: [
      { id: 's-ves-sz', title: '深圳场', startIn: 28 * DAY, days: 1, address: '深圳市（具体地址报名后通知）', depositCent: 468000, balanceCent: 0, balanceDueIn: 21 * DAY, quota: 80, taken: 52, pricePrefix: V },
    ],
  },

  // ── 线上精品课：五大系列 ──
  {
    id: 's-collagen',
    type: 'COLUMN',
    title: '循证解剖 — 胶原临床应用精讲',
    subtitle: '逻辑解剖与胶原产品联合应用系列课 · 4 节',
    cover: art(['循证解剖', '胶原临床应用精讲'], '胶原产品联合应用系列课', 'blue', '系列课'),
    categoryId: 'c-on-collagen',
    visibleTo: BOTH,
    pricingMode: 'PAID',
    priceCent: 29900,
    pricePrefix: V,
    detailHtml: h('系列介绍') + p('以面部层次与解剖为底层逻辑，系统讲解胶原产品的定位、注射与联合治疗。整套购买比单节更优惠。') + demoNote,
    chapters: [],
    items: ['r-col-1', 'r-col-2', 'r-col-3', 'r-col-4'],
  },
  {
    id: 's-ha',
    type: 'COLUMN',
    title: '循证解剖 — 玻尿酸临床应用精讲',
    subtitle: '逻辑解剖与玻尿酸产品联合应用系列课 · 4 节',
    cover: art(['循证解剖', '玻尿酸临床应用精讲'], '玻尿酸产品联合应用系列课', 'blue', '系列课'),
    categoryId: 'c-on-ha',
    visibleTo: BOTH,
    pricingMode: 'PAID',
    priceCent: 29900,
    pricePrefix: V,
    detailHtml: h('系列介绍') + p('从面部层次、韧带支撑到并发症预防，讲清玻尿酸填充背后的解剖与力学逻辑。整套购买比单节更优惠。') + demoNote,
    chapters: [],
    items: ['r-ha-1', 'r-ha-2', 'r-ha-3', 'r-ha-4'],
  },
  {
    id: 'p-smas',
    type: 'COURSE',
    title: '肉毒素应用 + 解密 SMAS',
    subtitle: '聚焦 SMAS · 精准掌握肉毒素注射核心 · 5 讲',
    cover: art(['肉毒素应用', '+ 解密 SMAS'], '吴宇萌 · 首发深度精讲', 'blue', '5节课程'),
    categoryId: 'c-on-smas',
    visibleTo: BOTH,
    pricingMode: 'PAID',
    priceCent: 198000,
    detailHtml:
      h('课程介绍') +
      p('以 SMAS 体系为主线，分区讲解泛眼周、泛口周与咀嚼肌群的肉毒素应用，并解读并发症的成因与规避。') +
      ul(['第一讲 SMAS 体系及肉毒素基础', '第二讲 泛眼周肌肉体系的除皱', '第三讲 泛口周肌肉体系的提升', '第四讲 咀嚼肌群的轮廓改善', '第五讲 注射肉毒素并发症的解读及规避']) +
      demoNote,
    chapters: [
      { id: 'smas-0', title: '学习须知', lessons: [{ id: 'smas-00', type: 'ARTICLE', title: '学习须知', duration: 0, isTrial: true, trialSeconds: 0, contentHtml: `<h3 style="margin:0 0 12px">学习须知</h3>${p('本课程共 5 讲 10 小节，建议按顺序学习。（演示占位）')}` }] },
      { id: 'smas-1', title: '第一讲 | SMAS 体系及肉毒素基础', lessons: [
        { id: 'smas-11', type: 'VIDEO', title: '1.1 SMAS 整体结构', duration: 1520, isTrial: true, trialSeconds: 180 },
        { id: 'smas-12', type: 'VIDEO', title: '1.2 肉毒素相关基础', duration: 1380, isTrial: false, trialSeconds: 0 },
      ] },
      { id: 'smas-2', title: '第二讲 | 泛眼周肌肉体系的除皱', lessons: [
        { id: 'smas-21', type: 'VIDEO', title: '2.1 泛眼周肌肉体系', duration: 1640, isTrial: false, trialSeconds: 0 },
        { id: 'smas-22', type: 'VIDEO', title: '2.2 除皱中的细节应用', duration: 1450, isTrial: false, trialSeconds: 0 },
      ] },
      { id: 'smas-3', title: '第三讲 | 泛口周肌肉体系的提升', lessons: [
        { id: 'smas-31', type: 'VIDEO', title: '3.1 泛口周肌肉体系', duration: 1580, isTrial: false, trialSeconds: 0 },
        { id: 'smas-32', type: 'VIDEO', title: '3.2 提升中的细节应用', duration: 1410, isTrial: false, trialSeconds: 0 },
      ] },
      { id: 'smas-4', title: '第四讲 | 咀嚼肌群的轮廓改善', lessons: [
        { id: 'smas-41', type: 'VIDEO', title: '4.1 咀嚼肌群解剖', duration: 1490, isTrial: false, trialSeconds: 0 },
        { id: 'smas-42', type: 'VIDEO', title: '4.2 轮廓改善的应用', duration: 1360, isTrial: false, trialSeconds: 0 },
      ] },
      { id: 'smas-5', title: '第五讲 | 注射肉毒素并发症的解读及规避', lessons: [
        { id: 'smas-51', type: 'VIDEO', title: '5.1 并发症的解读', duration: 1700, isTrial: false, trialSeconds: 0 },
        { id: 'smas-52', type: 'VIDEO', title: '5.2 并发症的规避', duration: 1520, isTrial: false, trialSeconds: 0 },
      ] },
    ],
  },
  {
    id: 'p-face',
    type: 'COURSE',
    title: '面部精细解剖技巧解析',
    subtitle: '讲师全程讲解 · 第一视角观看 · 已更新 6 期',
    cover: art(['面部精细解剖', '技巧解析'], '讲师全程讲解 · 第一视角观看', 'blue', '视频课程'),
    categoryId: 'c-on-face',
    visibleTo: BOTH,
    pricingMode: 'PAID',
    priceCent: 680000,
    rule: { type: 'LIMITED_TIME', priceCent: 498000, endIn: 6 * DAY + 7 * HOUR },
    detailHtml: h('课程介绍') + p('标本精细解剖全程录制，讲师第一视角讲解面部各层次结构与操作技巧，全部 3 小时 45 分钟。') + demoNote,
    chapters: [
      { id: 'face-1', title: '面部精细解剖技巧解析', lessons: [
        { id: 'face-0', type: 'VIDEO', title: '试看版', duration: 600, isTrial: true, trialSeconds: 0 },
        { id: 'face-a', type: 'VIDEO', title: '第一课', duration: 2700, isTrial: false, trialSeconds: 0 },
        { id: 'face-b', type: 'VIDEO', title: '第二课', duration: 2640, isTrial: false, trialSeconds: 0 },
        { id: 'face-c', type: 'VIDEO', title: '第三课', duration: 2580, isTrial: false, trialSeconds: 0 },
        { id: 'face-d', type: 'VIDEO', title: '第四课', duration: 2700, isTrial: false, trialSeconds: 0 },
        { id: 'face-e', type: 'VIDEO', title: '第五课', duration: 2880, isTrial: false, trialSeconds: 0 },
      ] },
    ],
  },
  {
    id: 's-live',
    type: 'COLUMN',
    title: '直播课程合集 · 吴宇萌院长精彩课程',
    subtitle: '解剖学底层逻辑 · 结合临床操作 · 热门话题讨论',
    cover: art(['直播课程合集'], '吴宇萌院长 · 精彩课程', 'teal', '合集'),
    categoryId: 'c-on-live',
    visibleTo: BOTH,
    pricingMode: 'PAID',
    priceCent: 498000,
    detailHtml: h('合集介绍') + p('收录全部专题直播回放：驾驭血管的艺术、泛眼周、泛口周、胶原蛋白、玻尿酸等专区，新直播上架后自动加入。') + demoNote,
    chapters: [],
    items: REPLAYS.map((r) => r.id),
  },
  {
    id: 'r-free-nose',
    type: 'COURSE',
    title: '鼻部栓塞危机处理全解析',
    subtitle: '从误判到转机 · 免费直播回放',
    cover: art(['鼻部栓塞', '危机处理全解析'], '从误判到转机', 'navy', '免费'),
    categoryId: 'c-on-live',
    visibleTo: BOTH,
    pricingMode: 'FREE',
    priceCent: 0,
    detailHtml: p('免费直播回放，认证用户可直接观看。') + demoNote,
    chapters: [{ id: 'nose-ch', title: '直播回放', lessons: [{ id: 'nose-1', type: 'VIDEO', title: '鼻部栓塞危机处理全解析', duration: 3900, isTrial: false, trialSeconds: 0 }] }],
  },
  ...REPLAYS,

  // ── 公益讲堂 ──
  {
    id: 'p-60s',
    type: 'COURSE',
    title: '每日 60 秒 · 侃侃而谈',
    subtitle: '医美解剖小话题 · 音频 · 免费',
    cover: art(['60 秒', '侃侃而谈'], '医美解剖小话题', 'amber', '音频'),
    categoryId: 'c-free-60',
    visibleTo: BOTH,
    pricingMode: 'FREE',
    priceCent: 0,
    detailHtml: p('每天 60 秒，用一个小问题讲透一个解剖知识点，碎片时间也能学。') + demoNote,
    chapters: [
      { id: '60s-ch', title: '最新话题', lessons: [
        { id: '60s-1', type: 'AUDIO', title: '皮肤收紧后会出现面颊凹陷？', duration: 62, isTrial: false, trialSeconds: 0 },
        { id: '60s-2', type: 'AUDIO', title: '为啥打完泪沟笑起来会鼓包', duration: 58, isTrial: false, trialSeconds: 0 },
        { id: '60s-3', type: 'AUDIO', title: '咬肌前间隙的脂肪有啥用？', duration: 61, isTrial: false, trialSeconds: 0 },
        { id: '60s-4', type: 'AUDIO', title: '解剖是技能还是工具？', duration: 60, isTrial: false, trialSeconds: 0 },
        { id: '60s-5', type: 'AUDIO', title: '面部为什么要有韧带？', duration: 59, isTrial: false, trialSeconds: 0 },
      ] },
    ],
  },
  {
    id: 'p-yxy',
    type: 'COURSE',
    title: '逻辑解剖云学苑 · 我不怕打针系列',
    subtitle: '图文 · 免费 · 同步公众号',
    cover: art(['逻辑解剖云学苑'], '我不怕打针系列 · 图文', 'navy', '图文'),
    categoryId: 'c-free-yxy',
    visibleTo: BOTH,
    pricingMode: 'FREE',
    priceCent: 0,
    detailHtml: p('析芒教育官方图文专栏，解剖知识与临床思考，持续更新。') + demoNote,
    chapters: [
      { id: 'yxy-ch', title: '最新文章', lessons: [
        { id: 'yxy-1', type: 'ARTICLE', title: '打溶酶≠治栓塞！多数并发症治疗都踩了这个误区', duration: 0, isTrial: false, trialSeconds: 0, contentHtml: placeholderArticle('打溶酶≠治栓塞！多数并发症治疗都踩了这个误区') },
        { id: 'yxy-2', type: 'ARTICLE', title: '那一针下去，你的脑子是空白，还是方案？', duration: 0, isTrial: false, trialSeconds: 0, contentHtml: placeholderArticle('那一针下去，你的脑子是空白，还是方案？') },
        { id: 'yxy-3', type: 'ARTICLE', title: '双 C 区怎么打更安全？', duration: 0, isTrial: false, trialSeconds: 0, contentHtml: placeholderArticle('双 C 区怎么打更安全？') },
        { id: 'yxy-4', type: 'ARTICLE', title: '鼻背纹的幕后推手，怎么一网打尽', duration: 0, isTrial: false, trialSeconds: 0, contentHtml: placeholderArticle('鼻背纹的幕后推手，怎么一网打尽') },
        { id: 'yxy-5', type: 'ARTICLE', title: '眼尾除皱不是“哪皱打哪”，那两根血管才是真正的“关卡”', duration: 0, isTrial: false, trialSeconds: 0, contentHtml: placeholderArticle('眼尾除皱不是“哪皱打哪”，那两根血管才是真正的“关卡”') },
      ] },
    ],
  },
];

export const BANNERS = [
  { id: 'b1', title: '“救”在眼前 并发症专题 北京专场', image: art(['“救”在眼前'], '并发症专题 · 北京专场 · 早鸟报名中', 'navy', '线下精品课', 750, 320), link: '/pages/course/detail?id=o-rescue', visibleTo: BOTH },
  { id: 'b2', title: '肉毒素应用 + 解密 SMAS', image: art(['肉毒素应用 + 解密 SMAS'], '吴宇萌 · 首发深度精讲 · 5 节课程', 'blue', '线上精品课', 750, 320), link: '/pages/course/detail?id=p-smas', visibleTo: BOTH },
  { id: 'b3', title: '直播课程合集', image: art(['直播课程合集'], '解剖学底层逻辑 · 结合临床操作 · 热门话题', 'teal', '合集', 750, 320), link: '/pages/course/detail?id=s-live', visibleTo: BOTH },
  { id: 'b4', title: '循证解剖 · 胶原临床应用精讲', image: art(['循证解剖', '胶原临床应用精讲'], '逻辑解剖与胶原产品联合应用系列课', 'blue', '系列课', 750, 320), link: '/pages/course/detail?id=s-collagen', visibleTo: BOTH },
  { id: 'b5', title: '品牌协作 · 产品共研 · 教研共建', image: art(['品牌协作 · 产品共研'], '与逻辑解剖一起，服务 5 万+ 医美医生', 'crimson', '合作', 750, 320), link: '/pages/join/index', visibleTo: BOTH },
];

/** 首页推荐栏目：后台可为医生 / 从业者分别配置，演示中两种身份看到的内容一致 */
const SECTIONS = [
  { title: '线下精品课', productIds: ['o-rescue', 'o-dissect', 'o-inject', 'o-vessel'] },
  { title: '专题课程', productIds: ['p-smas', 'p-face', 's-live'] },
  { title: '产品系列课', productIds: ['s-collagen', 's-ha'] },
  { title: '直播回放', productIds: ['r-free-nose', 'r-v1', 'r-m1', 'r-e1'] },
  { title: '公益讲堂', productIds: ['p-60s', 'p-yxy'] },
];
export const HOME_SECTIONS: Record<IdentityType, { title: string; productIds: string[] }[]> = {
  DOCTOR: SECTIONS,
  PRACTITIONER: SECTIONS,
};

export const COUPONS = [
  { id: 'cp-new', name: '新学员立减券', description: '全场线上课程可用', type: 'DIRECT' as const, thresholdCent: 0, discountCent: 2000, scope: 'ALL' as const, perUser: 1, categoryIds: [] as string[], productIds: [] as string[], soldOut: false },
  { id: 'cp-series', name: '系列课满减券', description: '满 299 可用', type: 'FULL_REDUCTION' as const, thresholdCent: 29900, discountCent: 5000, scope: 'ALL' as const, perUser: 2, categoryIds: [], productIds: [], soldOut: false },
  { id: 'cp-collagen', name: '胶原专区专享券', description: '胶原蛋白专区可用', type: 'DIRECT' as const, thresholdCent: 0, discountCent: 3000, scope: 'CATEGORY' as const, perUser: 1, categoryIds: ['c-on-collagen'], productIds: [], soldOut: false },
  { id: 'cp-smas', name: 'SMAS 课程券', description: '仅限「肉毒素应用 + 解密 SMAS」', type: 'FULL_REDUCTION' as const, thresholdCent: 198000, discountCent: 20000, scope: 'PRODUCT' as const, perUser: 1, categoryIds: [], productIds: ['p-smas'], soldOut: false },
  { id: 'cp-gone', name: '周年庆大额券', description: '已抢光示例', type: 'FULL_REDUCTION' as const, thresholdCent: 498000, discountCent: 50000, scope: 'ALL' as const, perUser: 1, categoryIds: [], productIds: [], soldOut: true },
];

export const JOIN_PAGE: JoinPageConfig = {
  hero: {
    title: '品牌协作 · 产品共研 · 教研共建',
    subtitle: '以解剖研究与临床前验证为依托，为品牌方产品落地提供专业后盾；与机构、渠道一起服务全国医美从业者。',
    image: null,
  },
  benefits: [
    { title: '品牌学术协作', desc: '品牌产品解剖解读、学术推广与临床前期验证招募' },
    { title: '研习会与讲师', desc: '线下精品课 / 闭门研习会名额，成为讲师或学术合伙人' },
    { title: '渠道与区域合伙', desc: '渠道合作、区域合伙、订货商与课程代理' },
    { title: '机构团课', desc: '机构采购、内训与团课合作' },
  ],
  cases: [
    { title: '10+ 行业头部品牌长期携手', desc: '华熙生物、高德美、艾尔建、美沃斯等品牌方的学术协作与产品共研', image: null },
    { title: '20+ 核心城市线下课程', desc: '北京、上海、广州、深圳、杭州、成都等城市持续开展线下精品课', image: null },
  ],
  faqs: [
    { q: '医生和行业从业者都可以申请合作吗？', a: '可以。提交后商务顾问会根据你的身份与需求推荐合适的合作方式。（演示文案）' },
    { q: '提交后多久会有人联系我？', a: '一般 1~2 个工作日内联系。（演示文案）' },
  ],
  formTitle: '提交合作意向',
  submitText: '提交',
  successText: '已收到你的合作意向，商务顾问会在 1~2 个工作日内与你联系',
};
