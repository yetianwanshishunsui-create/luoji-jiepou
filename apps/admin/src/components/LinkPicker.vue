<template>
  <!-- 站内跳转链接：选择页面，课程详情再选课程；生成 /pages/xxx?id=yyy -->
  <div class="link-picker">
    <el-select :model-value="page" placeholder="不跳转" clearable style="width: 160px" @update:model-value="onPage">
      <el-option v-for="p in LINKABLE_PAGES" :key="p.path" :label="p.label" :value="p.path" />
    </el-select>
    <div v-if="needsProduct" class="product">
      <ProductSelect :model-value="productId" :initial="initial" placeholder="选择课程" @update:model-value="onProduct" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { LINKABLE_PAGES } from '@luoji/shared';
import { computed } from 'vue';
import ProductSelect from './ProductSelect.vue';

const props = defineProps<{ modelValue: string | null; initial?: { id: string; title: string }[] }>();
const emit = defineEmits<{ 'update:modelValue': [string | null] }>();

const page = computed(() => props.modelValue?.split('?')[0] || undefined);
const productId = computed(() => /[?&]id=([^&]+)/.exec(props.modelValue ?? '')?.[1]);
const needsProduct = computed(() => LINKABLE_PAGES.some((p) => p.path === page.value && 'param' in p));

function onPage(path: string | undefined) {
  emit('update:modelValue', path || null);
}

function onProduct(id: string | string[]) {
  emit('update:modelValue', id ? `${page.value}?id=${id}` : page.value!);
}
</script>

<style scoped>
.link-picker {
  display: flex;
  gap: 8px;
  width: 100%;
}
.product {
  flex: 1;
}
</style>
