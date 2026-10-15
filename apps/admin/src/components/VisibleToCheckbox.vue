<template>
  <el-checkbox-group :model-value="modelValue" @update:model-value="(v) => emit('update:modelValue', v as IdentityType[])">
    <el-checkbox v-for="(label, value) in IdentityTypeLabel" :key="value" :value="value">{{ label }}</el-checkbox>
  </el-checkbox-group>
</template>

<script setup lang="ts">
import { IdentityTypeLabel, type IdentityType } from '@luoji/shared';

defineProps<{ modelValue: IdentityType[] }>();
const emit = defineEmits<{ 'update:modelValue': [IdentityType[]] }>();
</script>
