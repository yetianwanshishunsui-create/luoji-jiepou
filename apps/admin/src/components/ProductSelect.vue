<template>
  <!-- 课程远程搜索选择（单选 / 多选） -->
  <el-select
    :model-value="modelValue"
    :multiple="multiple"
    filterable
    remote
    clearable
    :remote-method="search"
    :loading="loading"
    :placeholder="placeholder"
    style="width: 100%"
    @update:model-value="(v: string | string[]) => emit('update:modelValue', v)"
    @focus="!options.length && search('')"
  >
    <el-option v-for="o in merged" :key="o.id" :label="o.title" :value="o.id">
      <span>{{ o.title }}</span>
      <span class="price">{{ o.priceCent != null ? `¥${(o.priceCent / 100).toFixed(2)}` : '' }}</span>
    </el-option>
  </el-select>
</template>

<script setup lang="ts">
import type { ProductType } from '@luoji/shared';
import { computed, ref } from 'vue';
import { contentApi } from '@/api/content';

const props = withDefaults(
  defineProps<{
    modelValue: string | string[] | undefined;
    multiple?: boolean;
    type?: ProductType;
    /** 已选项的回显（编辑时） */
    initial?: { id: string; title: string; priceCent?: number }[];
    placeholder?: string;
    /** 只显示可售付费课程（不含免费课、线下课），营销配置使用 */
    paidOnly?: boolean;
  }>(),
  { multiple: false, type: undefined, initial: () => [], placeholder: '搜索课程标题', paidOnly: false },
);
const emit = defineEmits<{ 'update:modelValue': [string | string[]] }>();

const options = ref<{ id: string; title: string; priceCent?: number; type: ProductType }[]>([]);
const loading = ref(false);

const merged = computed(() => {
  const seen = new Set(options.value.map((o) => o.id));
  return [...options.value, ...props.initial.filter((i) => !seen.has(i.id))];
});

async function search(keyword: string) {
  loading.value = true;
  try {
    const res = await contentApi.products({ page: 1, pageSize: 30, type: props.type, keyword: keyword || undefined });
    options.value = props.paidOnly ? res.list.filter((p) => p.pricingMode === 'PAID' && p.type !== 'OFFLINE') : res.list;
  } finally {
    loading.value = false;
  }
}

defineExpose({ options });
</script>

<style scoped>
.price {
  float: right;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  margin-left: 16px;
}
</style>
