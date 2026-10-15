/**
 * 上架前校验（纯函数）：返回阻止上架的问题列表，空数组表示可以上架。
 */
export interface PublishCheckInput {
  type: 'COURSE' | 'COLUMN' | 'SERIES' | 'OFFLINE';
  pricingMode: 'FREE' | 'PAID';
  priceCent: number;
  title: string;
  visibleTo: unknown;
  lessonCount: number;
  videoWithoutFile: number;
  itemCount: number;
  /** 专栏 / 系列中未上架的子课程数 */
  offlineItemCount: number;
  upcomingSessionCount: number;
}

export function publishProblems(p: PublishCheckInput): string[] {
  const problems: string[] = [];
  if (!p.title.trim()) problems.push('标题不能为空');
  if (!Array.isArray(p.visibleTo) || p.visibleTo.length === 0) problems.push('至少选择一种可见身份');
  if (p.pricingMode === 'PAID' && p.priceCent <= 0 && p.type !== 'OFFLINE') problems.push('付费课程价格必须大于 0');

  switch (p.type) {
    case 'COURSE':
      if (p.lessonCount === 0) problems.push('课程至少需要一个课时');
      if (p.videoWithoutFile > 0) problems.push(`有 ${p.videoWithoutFile} 个视频课时未关联视频文件`);
      break;
    case 'COLUMN':
    case 'SERIES':
      if (p.itemCount === 0) problems.push('专栏 / 系列至少需要包含一门课程');
      if (p.offlineItemCount > 0) problems.push(`包含 ${p.offlineItemCount} 门未上架的课程，学员购买后将无法学习`);
      break;
    case 'OFFLINE':
      if (p.upcomingSessionCount === 0) problems.push('线下课至少需要一个未开始的场次');
      break;
  }
  return problems;
}
