import sanitizeHtml from 'sanitize-html';

/**
 * 富文本白名单清洗：后台录入的课程介绍 / 图文课时在入库前统一处理，
 * 去掉脚本、事件属性和非 http(s) 链接。小程序 rich-text 只渲染这些基础标签。
 */
export function cleanHtml(html: string | null | undefined): string | null {
  if (!html) return null;
  return sanitizeHtml(html, {
    allowedTags: [
      'p', 'br', 'span', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'sub', 'sup',
      'h1', 'h2', 'h3', 'h4', 'h5', 'blockquote', 'pre', 'code', 'hr',
      'ul', 'ol', 'li', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    allowedAttributes: {
      a: ['href', 'title'],
      img: ['src', 'alt', 'width', 'height', 'style'],
      span: ['style'],
      p: ['style'],
      td: ['colspan', 'rowspan', 'style'],
      th: ['colspan', 'rowspan', 'style'],
    },
    allowedStyles: {
      '*': {
        color: [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/i],
        'background-color': [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/i],
        'text-align': [/^(left|right|center|justify)$/],
        'font-size': [/^\d+(px|em|rem|%)$/],
        'font-weight': [/^(bold|normal|\d{3})$/],
        width: [/^\d+(px|%)$/],
        height: [/^\d+(px|%)$/],
      },
    },
    allowedSchemes: ['http', 'https'],
    allowProtocolRelative: false,
    // src 被清洗掉的图片直接移除，避免留下空标签
    exclusiveFilter: (frame) => frame.tag === 'img' && !frame.attribs.src,
  });
}
