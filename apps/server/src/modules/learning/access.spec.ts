import { decideLessonAccess } from './access';

describe('decideLessonAccess', () => {
  const base = { productFree: false, owned: false, isTrial: false, trialSeconds: 0 };

  it('免费课程完整播放', () => {
    expect(decideLessonAccess({ ...base, productFree: true })).toEqual({ mode: 'FULL' });
  });

  it('已购完整播放，即使课时标记了试看', () => {
    expect(decideLessonAccess({ ...base, owned: true, isTrial: true, trialSeconds: 60 })).toEqual({ mode: 'FULL' });
  });

  it('未购 + 试看课时 → 限时试看', () => {
    expect(decideLessonAccess({ ...base, isTrial: true, trialSeconds: 120 })).toEqual({ mode: 'TRIAL', trialSeconds: 120 });
  });

  it('未购 + 试看时长 0 → 整节免费', () => {
    expect(decideLessonAccess({ ...base, isTrial: true })).toEqual({ mode: 'FULL' });
  });

  it('未购 + 非试看 → 拒绝', () => {
    expect(decideLessonAccess(base)).toEqual({ mode: 'DENY' });
  });
});
