import { publishProblems, type PublishCheckInput } from './publish-check';

const base: PublishCheckInput = {
  type: 'COURSE',
  pricingMode: 'PAID',
  priceCent: 9900,
  title: '课程',
  visibleTo: ['DOCTOR'],
  lessonCount: 3,
  videoWithoutFile: 0,
  itemCount: 0,
  offlineItemCount: 0,
  upcomingSessionCount: 0,
};

describe('publishProblems', () => {
  it('完整的课程可以上架', () => {
    expect(publishProblems(base)).toEqual([]);
  });

  it('付费课程价格为 0 不能上架', () => {
    expect(publishProblems({ ...base, priceCent: 0 })).toContain('付费课程价格必须大于 0');
  });

  it('免费课程价格为 0 可以上架', () => {
    expect(publishProblems({ ...base, pricingMode: 'FREE', priceCent: 0 })).toEqual([]);
  });

  it('没有可见身份不能上架', () => {
    expect(publishProblems({ ...base, visibleTo: [] })).toContain('至少选择一种可见身份');
  });

  it('课程没有课时、视频未关联文件不能上架', () => {
    expect(publishProblems({ ...base, lessonCount: 0 })).toContain('课程至少需要一个课时');
    expect(publishProblems({ ...base, videoWithoutFile: 2 })).toContain('有 2 个视频课时未关联视频文件');
  });

  it('专栏需要包含课程', () => {
    expect(publishProblems({ ...base, type: 'COLUMN', lessonCount: 0 })).toEqual(['专栏 / 系列至少需要包含一门课程']);
    expect(publishProblems({ ...base, type: 'COLUMN', lessonCount: 0, itemCount: 2 })).toEqual([]);
    expect(publishProblems({ ...base, type: 'SERIES', lessonCount: 0, itemCount: 2, offlineItemCount: 1 })).toEqual([
      '包含 1 门未上架的课程，学员购买后将无法学习',
    ]);
  });

  it('线下课需要未开始的场次，价格由场次定金 / 尾款决定', () => {
    const offline = { ...base, type: 'OFFLINE' as const, priceCent: 0, lessonCount: 0 };
    expect(publishProblems(offline)).toEqual(['线下课至少需要一个未开始的场次']);
    expect(publishProblems({ ...offline, upcomingSessionCount: 1 })).toEqual([]);
  });
});
