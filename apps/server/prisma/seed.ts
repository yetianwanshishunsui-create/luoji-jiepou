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

  const root = await prisma.category.upsert({
    where: { id: 'demo-cat-root' },
    create: { id: 'demo-cat-root', name: '产品系列', visibleTo: BOTH },
    update: {},
  });
  await prisma.category.upsert({
    where: { id: 'demo-cat-replay' },
    create: { id: 'demo-cat-replay', parentId: root.id, name: '专题回放', visibleTo: BOTH },
    update: {},
  });
  await prisma.product.upsert({
    where: { id: 'demo-course-1' },
    create: {
      id: 'demo-course-1',
      type: 'COURSE',
      title: '逻辑解剖入门（演示）',
      subtitle: '演示数据，可在后台删除',
      pricingMode: 'PAID',
      priceCent: 19900,
      visibleTo: BOTH,
      status: 'ONLINE',
      categoryId: 'demo-cat-replay',
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
