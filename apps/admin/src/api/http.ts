import type { ApiResponse } from '@luoji/shared';
import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '@/stores/auth';
import { router } from '@/router';

const instance = axios.create({ baseURL: import.meta.env.VITE_API_BASE ?? '', timeout: 15_000 });

instance.interceptors.request.use((config) => {
  const auth = useAuthStore();
  if (auth.token) config.headers.Authorization = `Bearer ${auth.token}`;
  return config;
});

instance.interceptors.response.use(
  (res) => res,
  async (err: AxiosError<ApiResponse>) => {
    const status = err.response?.status;
    const message = err.response?.data?.message ?? '网络异常，请稍后再试';
    if (status === 401) {
      useAuthStore().logout();
      router.replace({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } });
    }
    ElMessage.error(message);
    return Promise.reject(err);
  },
);

/** 解包统一响应，直接返回 data */
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const res = await instance.request<ApiResponse<T>>(config);
  return res.data.data;
}

/** 下载文件（带登录态）；文件名取自 Content-Disposition */
export async function download(url: string, params?: Record<string, unknown>): Promise<void> {
  const res = await instance.get<Blob>(url, { params, responseType: 'blob' });
  const disposition = String(res.headers['content-disposition'] ?? '');
  const match = /filename\*=UTF-8''([^;]+)/.exec(disposition);
  const name = match ? decodeURIComponent(match[1]) : 'download';
  const href = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // 立即 revoke 会让浏览器拿不到文件名（回退为 download），延迟释放
  setTimeout(() => URL.revokeObjectURL(href), 10_000);
}
