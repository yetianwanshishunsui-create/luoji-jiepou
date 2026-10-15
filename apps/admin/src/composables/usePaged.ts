import type { PageResult } from '@luoji/shared';
import { reactive, ref, type Ref } from 'vue';

/** 分页列表通用逻辑：filters 变化后调用 reload() */
export function usePaged<T, F extends object>(
  fetcher: (params: F & { page: number; pageSize: number }) => Promise<PageResult<T>>,
  initialFilters: F,
) {
  const filters = reactive({ ...initialFilters }) as F;
  const list = ref([]) as Ref<T[]>;
  const total = ref(0);
  const page = ref(1);
  const pageSize = ref(20);
  const loading = ref(false);

  async function load() {
    loading.value = true;
    try {
      const res = await fetcher({ ...filters, page: page.value, pageSize: pageSize.value });
      list.value = res.list;
      total.value = res.total;
    } finally {
      loading.value = false;
    }
  }

  function reload() {
    page.value = 1;
    return load();
  }

  return { filters, list, total, page, pageSize, loading, load, reload };
}
