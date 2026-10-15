import { defineStore } from 'pinia';
import type { AdminProfile } from '@/api';

const KEY = 'luoji_admin_auth';

function load(): { token: string; admin: AdminProfile | null } {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '') as { token: string; admin: AdminProfile };
  } catch {
    return { token: '', admin: null };
  }
}

export const useAuthStore = defineStore('auth', {
  state: load,
  getters: {
    loggedIn: (s) => !!s.token,
  },
  actions: {
    setSession(token: string, admin: AdminProfile) {
      this.token = token;
      this.admin = admin;
      localStorage.setItem(KEY, JSON.stringify({ token, admin }));
    },
    logout() {
      this.token = '';
      this.admin = null;
      localStorage.removeItem(KEY);
    },
  },
});
