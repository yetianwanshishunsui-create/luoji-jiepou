/**
 * tabBar 页面之间不能带 query（switchTab 不支持参数），
 * 首页分类入口通过这里把要定位的分类交给课程页，课程页取用后即清除。
 */
let pendingCategory: string | null = null;

export function openCourseCategory(categoryId: string) {
  pendingCategory = categoryId;
  uni.switchTab({ url: '/pages/course/list' });
}

export function takeCourseCategory(): string | null {
  const id = pendingCategory;
  pendingCategory = null;
  return id;
}
