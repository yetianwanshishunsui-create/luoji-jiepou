/**
 * tabBar 页面之间不能带 query（switchTab 不支持参数），
 * 首页分类入口通过这里把要定位的分类交给课程页，课程页取用后即清除。
 */
export interface CourseFilter {
  categoryId?: string;
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
