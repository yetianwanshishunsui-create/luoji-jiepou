import { cleanHtml } from './html';

describe('cleanHtml', () => {
  it('保留常用格式', () => {
    expect(cleanHtml('<p style="text-align: center"><strong>标题</strong></p>')).toBe(
      '<p style="text-align:center"><strong>标题</strong></p>',
    );
  });

  it('去掉脚本和事件属性', () => {
    expect(cleanHtml('<p onclick="alert(1)">a</p><script>alert(1)</script>')).toBe('<p>a</p>');
  });

  it('去掉 javascript: 链接', () => {
    expect(cleanHtml('<a href="javascript:alert(1)">x</a>')).toBe('<a>x</a>');
  });

  it('移除 src 不安全的图片', () => {
    expect(cleanHtml('<p>a<img src="javascript:alert(1)"></p>')).toBe('<p>a</p>');
    expect(cleanHtml('<img src="https://cdn.example.com/a.png">')).toBe('<img src="https://cdn.example.com/a.png" />');
  });

  it('空内容返回 null', () => {
    expect(cleanHtml('')).toBeNull();
    expect(cleanHtml(undefined)).toBeNull();
  });
});
