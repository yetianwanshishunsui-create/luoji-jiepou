/**
 * tabBar 页面之间不能带 query（switchTab 不支持参数），
 * 首页分类入口通过这里把要定位的分类交给课程页，课程页取用后即清除。
 */
export interface CourseFilter {
  categoryId?: string;
}

let pending: CourseFilter | null = null;

/** 透明自定义导航栏（状态栏 + 44px）的总高度，单位 px；CSS 变量 --status-bar-height 在小程序里是固定值，不能用 */
export const navBarHeight = () => (uni.getSystemInfoSync().statusBarHeight ?? 0) + 44;

export function openCourses(filter: CourseFilter) {
  pending = filter;
  uni.switchTab({ url: '/pages/course/list' });
}

export const openCourseCategory = (categoryId: string) => openCourses({ categoryId });

export function takeCourseFilter(): CourseFilter | null {
  const f = pending;
  pending = null;
  return f;
}
