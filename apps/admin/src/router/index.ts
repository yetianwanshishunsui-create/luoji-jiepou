import type { AdminRole } from '@luoji/shared';
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

declare module 'vue-router' {
  interface RouteMeta {
    title?: string;
    icon?: string;
    /** 允许访问的角色；为空表示所有管理员；SUPER_ADMIN 始终可见 */
    roles?: AdminRole[];
    /** 不在菜单中显示（详情 / 编辑页） */
    hidden?: boolean;
    /** 高亮的菜单项（隐藏页面指向其列表页） */
    activeMenu?: string;
  }
}

/** 侧边栏菜单即为 Layout 的 children（技术方案 4.7） */
export const menuRoutes: RouteRecordRaw[] = [
  { path: 'dashboard', name: 'dashboard', component: () => import('@/views/Dashboard.vue'), meta: { title: '工作台', icon: 'Odometer' } },
  {
    path: 'content',
    name: 'content',
    redirect: { name: 'content-products' },
    meta: { title: '内容管理', icon: 'Reading', roles: ['OPERATOR'] },
    children: [
      { path: 'products', name: 'content-products', component: () => import('@/views/content/ProductList.vue'), meta: { title: '课程' } },
      {
        path: 'products/new',
        name: 'content-product-new',
        component: () => import('@/views/content/ProductEdit.vue'),
        meta: { title: '新建课程', hidden: true, activeMenu: 'content-products' },
      },
      {
        path: 'products/:id',
        name: 'content-product-edit',
        component: () => import('@/views/content/ProductEdit.vue'),
        meta: { title: '编辑课程', hidden: true, activeMenu: 'content-products' },
      },
      { path: 'categories', name: 'content-categories', component: () => import('@/views/content/CategoryManage.vue'), meta: { title: '分类' } },
      { path: 'daily-audios', name: 'content-daily-audios', component: () => import('@/views/content/DailyAudioList.vue'), meta: { title: '每日音频' } },
    ],
  },
  {
    path: 'certifications',
    name: 'certifications',
    component: () => import('@/views/certifications/CertList.vue'),
    meta: { title: '认证审核', icon: 'Stamp', roles: ['REVIEWER'] },
  },
  { path: 'users', name: 'users', component: () => import('@/views/users/UserList.vue'), meta: { title: '用户', icon: 'User', roles: ['OPERATOR', 'REVIEWER'] } },
  { path: 'orders', name: 'orders', component: () => import('@/views/orders/OrderList.vue'), meta: { title: '订单', icon: 'Tickets', roles: ['FINANCE', 'OPERATOR'] } },
  {
    path: 'marketing',
    name: 'marketing',
    redirect: { name: 'marketing-coupons' },
    meta: { title: '营销', icon: 'Discount', roles: ['OPERATOR'] },
    children: [
      { path: 'coupons', name: 'marketing-coupons', component: () => import('@/views/marketing/CouponList.vue'), meta: { title: '优惠券' } },
      { path: 'price-rules', name: 'marketing-price-rules', component: () => import('@/views/marketing/PriceRuleList.vue'), meta: { title: '早鸟 / 限时价' } },
    ],
  },
  {
    path: 'site',
    name: 'site',
    redirect: { name: 'site-banners' },
    meta: { title: '运营配置', icon: 'Setting', roles: ['OPERATOR'] },
    children: [
      { path: 'banners', name: 'site-banners', component: () => import('@/views/site/BannerList.vue'), meta: { title: 'Banner' } },
      { path: 'home', name: 'site-home', component: () => import('@/views/site/HomeSlots.vue'), meta: { title: '首页推荐' } },
      { path: 'join', name: 'site-join', component: () => import('@/views/site/JoinPageEditor.vue'), meta: { title: '招商页' } },
    ],
  },
  { path: 'leads', name: 'leads', component: () => import('@/views/leads/LeadList.vue'), meta: { title: '招商线索', icon: 'Phone', roles: ['OPERATOR'] } },
  {
    path: 'system',
    name: 'system',
    redirect: { name: 'system-admins' },
    // roles 为空数组：仅超级管理员
    meta: { title: '系统', icon: 'Lock', roles: [] },
    children: [
      { path: 'admins', name: 'system-admins', component: () => import('@/views/system/AdminList.vue'), meta: { title: '管理员' } },
      { path: 'audit-logs', name: 'system-audit-logs', component: () => import('@/views/system/AuditLogList.vue'), meta: { title: '操作日志' } },
    ],
  },
];

const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: () => import('@/views/Login.vue'), meta: { title: '登录' } },
  { path: '/', component: () => import('@/layouts/AdminLayout.vue'), redirect: '/dashboard', children: menuRoutes },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

export const router = createRouter({ history: createWebHistory(), routes });

export function canAccess(role: AdminRole | undefined, roles?: AdminRole[]) {
  if (!roles) return true;
  return role === 'SUPER_ADMIN' || (!!role && roles.includes(role));
}

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.name !== 'login' && !auth.loggedIn) return { name: 'login', query: { redirect: to.fullPath } };
  if (to.name === 'login' && auth.loggedIn) return '/';
  if (!canAccess(auth.admin?.role, to.meta.roles)) return '/dashboard';
});

router.afterEach((to) => {
  document.title = `${to.meta.title ?? ''} · 逻辑解剖运营后台`;
});
