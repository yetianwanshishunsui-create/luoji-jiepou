import type { BodyPart } from '@luoji/shared';

/**
 * tabBar 页面之间不能带 query（switchTab 不支持参数），
 * 首页的分类 / 部位入口通过这里把筛选条件交给课程页，课程页取用后即清除。
 */
export interface CourseFilter {
  categoryId?: string;
  bodyPart?: BodyPart;
}

let pending: CourseFilter | null = null;

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
