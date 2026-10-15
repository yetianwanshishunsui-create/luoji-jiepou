<template>
  <!-- 以“分 + 秒”编辑、以“秒”存储 -->
  <div class="duration">
    <el-input-number :model-value="Math.floor(modelValue / 60)" :min="0" :max="1440" controls-position="right" @update:model-value="(m: number | undefined) => set(m ?? 0, modelValue % 60)" />
    <span>分</span>
    <el-input-number :model-value="modelValue % 60" :min="0" :max="59" controls-position="right" @update:model-value="(s: number | undefined) => set(Math.floor(modelValue / 60), s ?? 0)" />
    <span>秒</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{ modelValue: number }>();
const emit = defineEmits<{ 'update:modelValue': [number] }>();
const set = (m: number, s: number) => emit('update:modelValue', m * 60 + s);
</script>

<style scoped>
.duration {
  display: flex;
  align-items: center;
  gap: 8px;
}
.duration .el-input-number {
  width: 110px;
}
</style>
