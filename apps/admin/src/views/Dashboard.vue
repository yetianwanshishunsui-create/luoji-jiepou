<template>
  <el-row :gutter="16">
    <el-col v-for="item in cards" :key="item.label" :xs="24" :sm="12" :lg="6">
      <el-card shadow="never" class="stat" @click="item.to && router.push(item.to)">
        <div class="label">{{ item.label }}</div>
        <div class="value">{{ item.value }}</div>
      </el-card>
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/api';

const router = useRouter();
const data = ref({ pendingCerts: 0, todayOrders: 0, todayPaidCent: 0, todayLeads: 0 });

const cards = computed(() => [
  { label: '待审核认证', value: data.value.pendingCerts, to: { name: 'certifications', query: { status: 'PENDING' } } },
  { label: '今日支付订单', value: data.value.todayOrders, to: { name: 'orders' } },
  { label: '今日收款（元）', value: (data.value.todayPaidCent / 100).toFixed(2) },
  { label: '今日招商留资', value: data.value.todayLeads, to: { name: 'leads' } },
]);

onMounted(async () => {
  data.value = await api.dashboard();
});
</script>

<style scoped>
.stat {
  cursor: pointer;
  margin-bottom: 16px;
}
.label {
  color: #6b7570;
  font-size: 13px;
}
.value {
  margin-top: 8px;
  font-size: 28px;
  font-weight: 600;
  color: #2a5bd7;
}
</style>
