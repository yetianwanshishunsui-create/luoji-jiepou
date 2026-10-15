<template>
  <!-- 以“元”编辑、以“分”存储，避免浮点误差 -->
  <el-input-number
    :model-value="modelValue == null ? undefined : modelValue / 100"
    :min="0"
    :max="max / 100"
    :precision="2"
    :step="1"
    :disabled="disabled"
    :placeholder="placeholder"
    controls-position="right"
    @update:model-value="(v: number | undefined) => emit('update:modelValue', v == null ? null : Math.round(v * 100))"
  />
  <span class="unit">元</span>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ modelValue: number | null; max?: number; disabled?: boolean; placeholder?: string }>(), {
  max: 10_000_000,
  disabled: false,
  placeholder: '',
});
const emit = defineEmits<{ 'update:modelValue': [number | null] }>();
</script>

<style scoped>
.unit {
  margin-left: 8px;
  color: var(--el-text-color-secondary);
}
</style>
