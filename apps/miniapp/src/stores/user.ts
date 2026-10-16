import { CertStatus, type UserProfile } from '@luoji/shared';
import { defineStore } from 'pinia';
import { api } from '@/api';
import { setReloginHandler } from '@/utils/request';
import { tokenStorage } from '@/utils/storage';

function getLoginCode(): Promise<string> {
  // #ifdef MP-WEIXIN
  return new Promise((resolve, reject) => {
    uni.login({ provider: 'weixin', success: (r) => resolve(r.code), fail: reject });
  });
  // #endif
  // #ifndef MP-WEIXIN
  // H5 调试：后端开启 WX_MOCK_LOGIN 时，code 直接作为 openid
  let code = uni.getStorageSync('luoji_dev_code') as string;
  if (!code) {
    code = `h5_${Date.now()}`;
    try {
      uni.setStorageSync('luoji_dev_code', code);
    } catch {
      /* 本地存储不可用 */
    }
  }
  return Promise.resolve(code);
  // #endif
}

let pending: Promise<void> | null = null;

export const useUserStore = defineStore('user', {
  state: () => ({
    profile: null as UserProfile | null,
  }),
  getters: {
    certified: (s) => s.profile?.certStatus === CertStatus.APPROVED,
  },
  actions: {
    /** 静默登录（并发调用只发一次） */
    async login() {
      pending ??= (async () => {
        const code = await getLoginCode();
        const res = await api.wxLogin(code);
        tokenStorage.set({ accessToken: res.accessToken, refreshToken: res.refreshToken });
        this.profile = res.user;
      })().finally(() => {
        pending = null;
      });
      return pending;
    },

    async ensureLogin() {
      if (this.profile) return;
      if (tokenStorage.get()) {
        try {
          this.profile = await api.me();
          return;
        } catch {
          /* token 失效则重新登录 */
        }
      }
      await this.login();
    },

    async refreshProfile() {
      this.profile = await api.me();
    },
  },
});

setReloginHandler(() => useUserStore().login());
