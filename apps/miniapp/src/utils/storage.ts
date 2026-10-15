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
    uni.setStorageSync(TOKEN, tokens);
  },
  clear() {
    uni.removeStorageSync(TOKEN);
  },
};
