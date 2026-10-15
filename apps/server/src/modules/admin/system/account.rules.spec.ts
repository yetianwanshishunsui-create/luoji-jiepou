import { losesLastSuperAdmin, passwordProblem } from './account.rules';

describe('passwordProblem', () => {
  it('合法密码', () => expect(passwordProblem('Luoji2026', 'admin')).toBeNull());
  it('长度', () => {
    expect(passwordProblem('ab12')).toBe('密码长度需为 8~64 位');
    expect(passwordProblem('a1'.repeat(33))).toBe('密码长度需为 8~64 位');
  });
  it('需同时包含字母和数字', () => {
    expect(passwordProblem('12345678')).toBe('密码需同时包含字母和数字');
    expect(passwordProblem('abcdefgh')).toBe('密码需同时包含字母和数字');
  });
  it('不能与用户名相同（忽略大小写）', () => {
    expect(passwordProblem('Finance01', 'finance01')).toBe('密码不能与用户名相同');
  });
});

describe('losesLastSuperAdmin', () => {
  const sa = { role: 'SUPER_ADMIN', disabled: false };
  it('唯一的超级管理员不能停用或降级', () => {
    expect(losesLastSuperAdmin(sa, { ...sa, disabled: true }, 1)).toBe(true);
    expect(losesLastSuperAdmin(sa, { role: 'OPERATOR', disabled: false }, 1)).toBe(true);
  });
  it('还有其他超级管理员时可以', () => {
    expect(losesLastSuperAdmin(sa, { ...sa, disabled: true }, 2)).toBe(false);
  });
  it('普通管理员不受影响', () => {
    expect(losesLastSuperAdmin({ role: 'OPERATOR', disabled: false }, { role: 'OPERATOR', disabled: true }, 1)).toBe(false);
  });
  it('只改名称等不影响', () => {
    expect(losesLastSuperAdmin(sa, sa, 1)).toBe(false);
  });
});
