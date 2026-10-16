const TOKEN = 'luoji_tokens';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export const tokenStorage = {
  get(): Tokens | null {
    return (uni.getStorageSync(TOKEN) as Tokens) || null;
  },
  set(tokens: Tokens) {
    try {
      uni.setStorageSync(TOKEN, tokens);
    } catch {
      // H5 禁用本地存储时忽略，下次启动重新静默登录
    }
  },
  clear() {
    uni.removeStorageSync(TOKEN);
  },
};
