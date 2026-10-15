import { isTabPage, linkProblem } from '@luoji/shared';

describe('linkProblem（Banner / 运营位跳转校验）', () => {
  it('空链接表示不跳转', () => {
    expect(linkProblem(null)).toBeNull();
    expect(linkProblem('')).toBeNull();
  });

  it('允许白名单内的站内页面', () => {
    expect(linkProblem('/pages/coupon/center')).toBeNull();
    expect(linkProblem('/pages/course/detail?id=cmv8yg7xs000b7dpfyemcnmdo')).toBeNull();
  });

  it('课程详情必须带 id，其他页面不接受参数', () => {
    expect(linkProblem('/pages/course/detail')).toBe('课程详情需要指定 id');
    expect(linkProblem('/pages/course/detail?id=')).toBe('课程详情需要指定 id');
    expect(linkProblem('/pages/coupon/center?x=1')).toBe('领券中心不支持参数');
  });

  it('拒绝外链和白名单外页面', () => {
    expect(linkProblem('https://example.com')).toBe('只能跳转到小程序内的指定页面');
    expect(linkProblem('/pages/cert/index')).toBe('只能跳转到小程序内的指定页面');
    expect(linkProblem('/pages/course/detail?id=a&b=c')).toBe('课程详情需要指定 id');
  });

  it('识别 tabBar 页面', () => {
    expect(isTabPage('/pages/course/list')).toBe(true);
    expect(isTabPage('/pages/course/detail?id=1')).toBe(false);
  });
});
