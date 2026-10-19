/**
 * 种子数据：初始超级管理员 + 演示分类 / 课程（仅开发环境使用演示数据）。
 * 运行：pnpm --filter @luoji/server prisma:seed
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const BOTH = ['DOCTOR', 'PRACTITIONER'];

async function main() {
  const username = process.env.SEED_ADMIN_USERNAME ?? 'admin';
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) throw new Error('请设置 SEED_ADMIN_PASSWORD');

  await prisma.adminUser.upsert({
    where: { username },
    create: { username, name: '超级管理员', role: 'SUPER_ADMIN', passwordHash: await bcrypt.hash(password, 10) },
    update: {},
  });
  console.log(`✔ 管理员 ${username}`);

  if (process.env.NODE_ENV === 'production') return;

  // 课程体系（与品牌资料一致）：一级三大板块，二级为主题 / 系列 / 专区
  const tree: [string, string, [string, string][]][] = [
    ['cat-offline', '线下精品课', [['cat-off-core', '核心框架课'], ['cat-off-clinic', '临床转化课'], ['cat-off-risk', '风险应急课'], ['cat-off-vessel', '血管安全专项']]],
    ['cat-online', '线上精品课', [['cat-on-collagen', '胶原蛋白专区'], ['cat-on-ha', '玻尿酸专区'], ['cat-on-smas', '肉毒素 · SMAS'], ['cat-on-face', '面部精细解剖'], ['cat-on-live', '专题直播回放']]],
    ['cat-free', '公益讲堂', [['cat-free-60', '每日 60 秒'], ['cat-free-yxy', '云学苑']]],
  ];
  for (const [i, [id, name, children]] of tree.entries()) {
    await prisma.category.upsert({ where: { id }, create: { id, name, sort: i, visibleTo: BOTH }, update: {} });
    for (const [j, [cid, cname]] of children.entries()) {
      await prisma.category.upsert({ where: { id: cid }, create: { id: cid, parentId: id, name: cname, sort: j, visibleTo: BOTH }, update: {} });
    }
  }
  await prisma.product.upsert({
    where: { id: 'demo-course-1' },
    create: {
      id: 'demo-course-1',
      type: 'COURSE',
      title: '鼻部栓塞危机处理全解析（演示）',
      subtitle: '演示数据，可在后台删除',
      pricingMode: 'PAID',
      priceCent: 19900,
      visibleTo: BOTH,
      status: 'ONLINE',
      categoryId: 'cat-on-live',
      chapters: {
        create: {
          title: '第一章',
          lessons: {
            create: [
              { type: 'VIDEO', title: '1-1 课程导读（试看）', duration: 300, isTrial: true, trialSeconds: 0 },
              { type: 'VIDEO', title: '1-2 核心概念', duration: 900, isTrial: true, trialSeconds: 120, sort: 1 },
              { type: 'ARTICLE', title: '1-3 课后讲义', contentHtml: '<p>演示讲义</p>', sort: 2 },
            ],
          },
        },
      },
    },
    update: {},
  });
  console.log('✔ 演示分类与课程');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
