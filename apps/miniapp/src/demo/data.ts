/**
 * 演示版数据（VITE_DEMO=true 时使用）：课程、优惠券、招商页等均为拟定的占位内容，
 * 正式环境由管理后台录入。
 */
import type { IdentityType, JoinPageConfig, ProductType } from '@luoji/shared';

const DAY = 86_400_000;
const HOUR = 3_600_000;

/** 生成纯色占位图（SVG data URI），避免依赖外部图片 */
function art(title: string, sub: string, hue: number, w = 690, h = 360): string {
  // 课程封面（接近 3:2）文字居中，列表缩略图裁切后仍完整；Banner 文字靠左
  const center = w / h < 1.8;
  const x = center ? w / 2 : w * 0.07;
  const anchor = center ? 'middle' : 'start';
  const font = 'PingFang SC,Microsoft YaHei,sans-serif';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<rect width="${w}" height="${h}" fill="hsl(${hue},38%,30%)"/>
<circle cx="${w * 0.82}" cy="${h * 0.3}" r="${h * 0.55}" fill="hsl(${hue},40%,38%)"/>
<circle cx="${w * 0.95}" cy="${h * 0.95}" r="${h * 0.35}" fill="hsl(${hue},42%,45%)"/>
<text x="${x}" y="${h * 0.5}" text-anchor="${anchor}" font-family="${font}" font-size="${center ? h * 0.12 : h * 0.13}" font-weight="700" fill="#fff">${title}</text>
<text x="${x}" y="${h * 0.68}" text-anchor="${anchor}" font-family="${font}" font-size="${h * 0.07}" fill="#fff" fill-opacity="0.85">${sub}</text>
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
  /** 相对演示开始时间的偏移（毫秒） */
  startIn: number;
  days: number;
  address: string;
  depositCent: number;
  balanceCent: number;
  balanceDueIn: number;
  quota: number;
  /** 演示开始时已被其他学员占用的名额 */
  taken: number;
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
}

const article = (title: string, paras: string[]) =>
  `<h3 style="margin:0 0 12px">${title}</h3>` + paras.map((p) => `<p style="line-height:1.8;margin:0 0 12px">${p}</p>`).join('');

const intro = (points: string[]) =>
  `<p style="line-height:1.8">本课程内容为演示占位，正式内容由运营在管理后台录入。</p><p style="font-weight:600;margin-top:12px">你将学到</p><ul>${points
    .map((p) => `<li style="line-height:1.8">${p}</li>`)
    .join('')}</ul>`;

export const CATEGORIES = [
  { id: 'c-upper', name: '上肢', children: [{ id: 'c-shoulder', name: '肩关节' }, { id: 'c-elbow', name: '肘与腕' }] },
  { id: 'c-spine', name: '脊柱', children: [{ id: 'c-neck', name: '颈椎' }, { id: 'c-lumbar', name: '腰椎与骨盆' }] },
  { id: 'c-lower', name: '下肢', children: [{ id: 'c-knee', name: '膝与踝' }] },
  { id: 'c-practice', name: '线下实操', children: [] },
];

export const PRODUCTS: DemoProduct[] = [
  {
    id: 'p-shoulder',
    type: 'COURSE',
    title: '肩关节逻辑解剖精讲',
    subtitle: '从结构到功能，理解肩痛的来龙去脉',
    cover: art('肩关节逻辑解剖', '视频 · 音频 · 图文', 150, 480, 320),
    categoryId: 'c-shoulder',
    visibleTo: ['DOCTOR', 'PRACTITIONER'],
    pricingMode: 'PAID',
    priceCent: 39900,
    rule: { type: 'EARLY_BIRD', priceCent: 29900, endIn: 2 * DAY + 5 * HOUR },
    detailHtml: intro(['肩关节复合体的结构与运动链', '常见肩痛的解剖学推理路径', '评估要点与临床案例拆解']),
    chapters: [
      {
        id: 'ch-s1',
        title: '第一章 肩关节复合体',
        lessons: [
          { id: 'l-s11', type: 'VIDEO', title: '1.1 课程导学：为什么要讲“逻辑”', duration: 512, isTrial: true, trialSeconds: 180 },
          {
            id: 'l-s12',
            type: 'ARTICLE',
            title: '1.2 盂肱关节与肩胛胸壁关节',
            duration: 0,
            isTrial: true,
            trialSeconds: 0,
            contentHtml: article('盂肱关节与肩胛胸壁关节（演示图文）', [
              '肩关节并不是单一关节，而是由盂肱关节、肩锁关节、胸锁关节和肩胛胸壁“关节”共同组成的复合体。',
              '理解它们之间的分工与协同，是分析肩部问题的第一步。本节为图文课时示例，正式内容由运营在后台用富文本编辑。',
            ]),
          },
          { id: 'l-s13', type: 'AUDIO', title: '1.3 肩袖：被低估的稳定结构', duration: 1260, isTrial: false, trialSeconds: 0 },
        ],
      },
      {
        id: 'ch-s2',
        title: '第二章 临床推理',
        lessons: [
          { id: 'l-s21', type: 'VIDEO', title: '2.1 肩痛的分层推理', duration: 1840, isTrial: false, trialSeconds: 0 },
          {
            id: 'l-s22',
            type: 'ARTICLE',
            title: '2.2 案例：反复发作的前侧肩痛',
            duration: 0,
            isTrial: false,
            trialSeconds: 0,
            contentHtml: article('案例：反复发作的前侧肩痛（演示图文）', ['这是购买后才能阅读的图文课时示例。']),
          },
        ],
      },
    ],
  },
  {
    id: 'p-lumbar',
    type: 'COURSE',
    title: '腰椎与骨盆：从结构到功能',
    subtitle: '医生专享 · 影像与体征的对应关系',
    cover: art('腰椎与骨盆', '医生专享', 205, 480, 320),
    categoryId: 'c-lumbar',
    visibleTo: ['DOCTOR'],
    pricingMode: 'PAID',
    priceCent: 49900,
    detailHtml: intro(['腰椎节段运动学', '骨盆带力学与常见误区', '影像所见与临床表现的对应']),
    chapters: [
      {
        id: 'ch-l1',
        title: '第一章 腰椎节段',
        lessons: [
          { id: 'l-l11', type: 'VIDEO', title: '1.1 节段运动与稳定', duration: 1500, isTrial: true, trialSeconds: 120 },
          { id: 'l-l12', type: 'VIDEO', title: '1.2 椎间盘的力学', duration: 1680, isTrial: false, trialSeconds: 0 },
        ],
      },
    ],
  },
  {
    id: 'p-neck',
    type: 'COURSE',
    title: '颈椎常见问题解析',
    subtitle: '免费公开课',
    cover: art('颈椎常见问题', '免费公开课', 30, 480, 320),
    categoryId: 'c-neck',
    visibleTo: ['DOCTOR', 'PRACTITIONER'],
    pricingMode: 'FREE',
    priceCent: 0,
    detailHtml: intro(['颈椎的结构特点', '低头族的颈部问题', '日常自我管理建议']),
    chapters: [
      {
        id: 'ch-n1',
        title: '公开课',
        lessons: [
          {
            id: 'l-n11',
            type: 'ARTICLE',
            title: '颈椎为什么“怕”低头',
            duration: 0,
            isTrial: false,
            trialSeconds: 0,
            contentHtml: article('颈椎为什么“怕”低头（演示图文）', [
              '头部重量约占体重的 7%~8%，低头角度越大，颈后部结构承受的负荷越高。',
              '这是一节免费课时示例：免费课程认证后即可学习，无需下单。',
            ]),
          },
          { id: 'l-n12', type: 'VIDEO', title: '颈部自我评估演示', duration: 720, isTrial: false, trialSeconds: 0 },
        ],
      },
    ],
  },
  {
    id: 'p-spine-column',
    type: 'COLUMN',
    title: '脊柱逻辑解剖专栏',
    subtitle: '含 2 门课程，打包更优惠',
    cover: art('脊柱专栏', '含 2 门课程', 265, 480, 320),
    categoryId: 'c-spine',
    visibleTo: ['DOCTOR'],
    pricingMode: 'PAID',
    priceCent: 69900,
    detailHtml: intro(['腰椎与骨盆：从结构到功能', '颈椎常见问题解析', '专栏持续更新']),
    chapters: [],
    items: ['p-lumbar', 'p-neck'],
  },
  {
    id: 'p-assess',
    type: 'COURSE',
    title: '徒手评估入门',
    subtitle: '从业者专享 · 限时特价',
    cover: art('徒手评估入门', '从业者专享', 95, 480, 320),
    categoryId: 'c-upper',
    visibleTo: ['PRACTITIONER'],
    pricingMode: 'PAID',
    priceCent: 19900,
    rule: { type: 'LIMITED_TIME', priceCent: 9900, endIn: 9 * HOUR },
    detailHtml: intro(['评估前的问诊逻辑', '常用徒手检查', '记录与复评']),
    chapters: [
      {
        id: 'ch-a1',
        title: '第一章 评估基础',
        lessons: [
          { id: 'l-a11', type: 'VIDEO', title: '1.1 评估的目的与流程', duration: 900, isTrial: true, trialSeconds: 120 },
          { id: 'l-a12', type: 'VIDEO', title: '1.2 上肢常用检查', duration: 1320, isTrial: false, trialSeconds: 0 },
        ],
      },
    ],
  },
  {
    id: 'p-lower',
    type: 'SERIES',
    title: '下肢力线系列课',
    subtitle: '从业者专享 · 膝与踝',
    cover: art('下肢力线系列', '膝与踝', 340, 480, 320),
    categoryId: 'c-knee',
    visibleTo: ['PRACTITIONER'],
    pricingMode: 'PAID',
    priceCent: 29900,
    detailHtml: intro(['下肢力线的观察方法', '膝关节常见问题', '踝足与步态']),
    chapters: [
      {
        id: 'ch-k1',
        title: '第一章 力线观察',
        lessons: [
          { id: 'l-k11', type: 'VIDEO', title: '1.1 站姿与力线', duration: 840, isTrial: true, trialSeconds: 90 },
          { id: 'l-k12', type: 'AUDIO', title: '1.2 膝关节的“委屈”', duration: 960, isTrial: false, trialSeconds: 0 },
        ],
      },
    ],
  },
  {
    id: 'p-workshop',
    type: 'OFFLINE',
    title: '逻辑解剖线下实操工作坊',
    subtitle: '2 天面授 · 小班实操',
    cover: art('线下实操工作坊', '2 天面授 · 小班', 20, 480, 320),
    categoryId: 'c-practice',
    visibleTo: ['DOCTOR', 'PRACTITIONER'],
    pricingMode: 'PAID',
    priceCent: 0,
    detailHtml:
      '<p style="line-height:1.8">线下课先付定金锁定名额，开课前按截止时间付清尾款。场次、地点、价格均为演示占位。</p><p style="font-weight:600;margin-top:12px">课程安排</p><ul><li style="line-height:1.8">第 1 天：解剖结构触诊与定位</li><li style="line-height:1.8">第 2 天：评估实操与案例讨论</li></ul>',
    chapters: [],
    sessions: [
      { id: 's-bj', title: '北京场', startIn: 30 * DAY, days: 2, address: '北京市朝阳区（具体地址报名后通知）', depositCent: 50000, balanceCent: 250000, balanceDueIn: 23 * DAY, quota: 30, taken: 22 },
      { id: 's-sh', title: '上海场（全款定金）', startIn: 45 * DAY, days: 2, address: '上海市徐汇区（具体地址报名后通知）', depositCent: 300000, balanceCent: 0, balanceDueIn: 38 * DAY, quota: 20, taken: 17 },
      { id: 's-gz', title: '广州场', startIn: 60 * DAY, days: 2, address: '广州市天河区', depositCent: 50000, balanceCent: 250000, balanceDueIn: 53 * DAY, quota: 20, taken: 20 },
    ],
  },
];

export const BANNERS = [
  { id: 'b1', title: '肩关节早鸟价', image: art('早鸟价进行中', '肩关节逻辑解剖精讲', 150, 750, 320), link: '/pages/course/detail?id=p-shoulder', visibleTo: ['DOCTOR', 'PRACTITIONER'] },
  { id: 'b2', title: '线下工作坊报名中', image: art('线下工作坊报名中', '北京 · 上海 · 广州', 20, 750, 320), link: '/pages/course/detail?id=p-workshop', visibleTo: ['DOCTOR', 'PRACTITIONER'] },
  { id: 'b3', title: '新人领券', image: art('新人专享券', '最高减 80 元', 265, 750, 320), link: '/pages/coupon/center', visibleTo: ['DOCTOR'] },
  { id: 'b4', title: '从业者合作', image: art('成为合作伙伴', '了解合作政策', 95, 750, 320), link: '/pages/join/index', visibleTo: ['PRACTITIONER'] },
];

/** 首页推荐栏目：医生 / 从业者分别配置 */
export const HOME_SECTIONS: Record<IdentityType, { title: string; productIds: string[] }[]> = {
  DOCTOR: [
    { title: '医生精选', productIds: ['p-shoulder', 'p-lumbar', 'p-spine-column'] },
    { title: '免费与线下', productIds: ['p-neck', 'p-workshop'] },
  ],
  PRACTITIONER: [
    { title: '从业者必修', productIds: ['p-assess', 'p-shoulder', 'p-lower'] },
    { title: '免费与线下', productIds: ['p-neck', 'p-workshop'] },
  ],
};

export const COUPONS = [
  { id: 'cp-new', name: '新学员满减券', description: '全场课程可用', type: 'FULL_REDUCTION' as const, thresholdCent: 29900, discountCent: 5000, scope: 'ALL' as const, perUser: 1, categoryIds: [] as string[], productIds: [] as string[], soldOut: false },
  { id: 'cp-direct', name: '立减券', description: '无门槛使用', type: 'DIRECT' as const, thresholdCent: 0, discountCent: 2000, scope: 'ALL' as const, perUser: 2, categoryIds: [], productIds: [], soldOut: false },
  { id: 'cp-spine', name: '脊柱专享券', description: '脊柱分类课程可用', type: 'FULL_REDUCTION' as const, thresholdCent: 49900, discountCent: 8000, scope: 'CATEGORY' as const, perUser: 1, categoryIds: ['c-spine', 'c-neck', 'c-lumbar'], productIds: [], soldOut: false },
  { id: 'cp-shoulder', name: '肩关节课程券', description: '仅限肩关节精讲', type: 'DIRECT' as const, thresholdCent: 0, discountCent: 3000, scope: 'PRODUCT' as const, perUser: 1, categoryIds: [], productIds: ['p-shoulder'], soldOut: false },
  { id: 'cp-gone', name: '周年庆大额券', description: '已抢光示例', type: 'FULL_REDUCTION' as const, thresholdCent: 59900, discountCent: 15000, scope: 'ALL' as const, perUser: 1, categoryIds: [], productIds: [], soldOut: true },
];

export const JOIN_PAGE: JoinPageConfig = {
  hero: { title: '成为逻辑解剖合作伙伴', subtitle: '面向康复、理疗、运动健康等机构与从业者（演示文案）', image: art('携手合作', '共建专业教学体系', 95, 750, 360) },
  benefits: [
    { title: '课程授权', desc: '机构内部培训可使用平台课程体系' },
    { title: '师资支持', desc: '定期安排讲师线下带教' },
    { title: '品牌联合', desc: '联合举办工作坊与公开课' },
    { title: '专属顾问', desc: '一对一对接合作细节' },
  ],
  cases: [
    { title: '某康复中心（示例）', desc: '引入课程体系后，新员工培训周期明显缩短', image: null },
    { title: '某运动健康机构（示例）', desc: '联合举办 3 场线下工作坊', image: null },
  ],
  faqs: [
    { q: '个人从业者可以合作吗？', a: '可以，提交信息后顾问会根据你的情况推荐合适的方式。（演示文案）' },
    { q: '合作需要什么条件？', a: '具体条件以顾问沟通为准，本页内容均可在后台修改。（演示文案）' },
  ],
  formTitle: '留下联系方式',
  submitText: '提交',
  successText: '已收到，我们会在 1~2 个工作日内与你联系',
};
