/** 后端地址：H5 走 Vite 代理（同源），小程序用完整 HTTPS 域名 */
let base = import.meta.env.VITE_API_BASE ?? '';
// #ifdef H5
base = '';
// #endif
export const API_BASE = base;
