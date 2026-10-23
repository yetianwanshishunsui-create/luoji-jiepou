import { canReview, ratingSummary, reviewProblem, reviewerName, statusAfterSecCheck } from './review.rules';

describe('reviewProblem', () => {
  it('评分必须是 1~5 的整数', () => {
    expect(reviewProblem({ rating: 0, content: '讲得很清楚，收获很大' })).toBe('请选择 1~5 星评分');
    expect(reviewProblem({ rating: 6, content: '讲得很清楚，收获很大' })).toBe('请选择 1~5 星评分');
    expect(reviewProblem({ rating: 4.5, content: '讲得很清楚，收获很大' })).toBe('请选择 1~5 星评分');
  });
  it('内容长度 5~500，按去掉首尾空格计算', () => {
    expect(reviewProblem({ rating: 5, content: '  很好  ' })).toBe('评价内容至少 5 个字');
    expect(reviewProblem({ rating: 5, content: '好'.repeat(501) })).toBe('评价内容不能超过 500 个字');
    expect(reviewProblem({ rating: 5, content: '层次讲得非常清楚' })).toBeNull();
  });
});

describe('canReview', () => {
  it('免费课程不可评价', () => expect(canReview({ free: true, owned: true, enrolled: false })).toBe(false));
  it('有权益或已报名线下课可评价', () => {
    expect(canReview({ free: false, owned: true, enrolled: false })).toBe(true);
    expect(canReview({ free: false, owned: false, enrolled: true })).toBe(true);
  });
  it('未购买不可评价', () => expect(canReview({ free: false, owned: false, enrolled: false })).toBe(false));
});

describe('statusAfterSecCheck', () => {
  it('pass 直接展示，review / 检测失败待审核，risky 拒绝', () => {
    expect(statusAfterSecCheck('pass')).toBe('VISIBLE');
    expect(statusAfterSecCheck('review')).toBe('PENDING');
    expect(statusAfterSecCheck('error')).toBe('PENDING');
    expect(statusAfterSecCheck('risky')).toBeNull();
  });
});

describe('reviewerName', () => {
  it('匿名或无昵称显示匿名用户', () => {
    expect(reviewerName(true, '张医生')).toBe('匿名用户');
    expect(reviewerName(false, null)).toBe('匿名用户');
    expect(reviewerName(false, '  ')).toBe('匿名用户');
  });
  it('实名只显示首字', () => expect(reviewerName(false, '张医生')).toBe('张**'));
});

describe('ratingSummary', () => {
  it('平均分保留 1 位小数', () => {
    expect(ratingSummary([])).toEqual({ count: 0, avgRating: null });
    expect(ratingSummary([5, 4, 5])).toEqual({ count: 3, avgRating: 4.7 });
  });
});
