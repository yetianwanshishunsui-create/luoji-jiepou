<template>
  <el-card shadow="never">
    <el-form inline>
      <el-form-item label="状态">
        <el-select v-model="filters.status" clearable placeholder="全部" style="width: 140px" @change="reload">
          <el-option v-for="(label, value) in LeadStatusLabel" :key="value" :label="label" :value="value" />
        </el-select>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column prop="name" label="姓名" width="120" />
      <el-table-column prop="phoneMasked" label="手机号" width="130" />
      <el-table-column prop="city" label="城市" width="100" />
      <el-table-column prop="organization" label="机构" min-width="140" />
      <el-table-column prop="intention" label="意向" min-width="160" show-overflow-tooltip />
      <el-table-column label="状态" width="130">
        <template #default="{ row }">
          <el-select :model-value="row.status" size="small" @change="(v: LeadStatus) => save(row as LeadRow, { status: v })">
            <el-option v-for="(label, value) in LeadStatusLabel" :key="value" :label="label" :value="value" />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column label="备注" min-width="180">
        <template #default="{ row }">
          <el-input :model-value="row.remark" size="small" placeholder="跟进备注" @change="(v: string) => save(row as LeadRow, { remark: v })" />
        </template>
      </el-table-column>
      <el-table-column label="提交时间" width="170">
        <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString('zh-CN', { hour12: false }) }}</template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      v-model:page-size="pageSize"
      class="pager"
      layout="total, prev, pager, next"
      :total="total"
      @current-change="load"
    />
  </el-card>
</template>

<script setup lang="ts">
import { LeadStatusLabel, type LeadStatus } from '@luoji/shared';
import { ElMessage } from 'element-plus';
import { onMounted } from 'vue';
import { api, type LeadRow } from '@/api';
import { usePaged } from '@/composables/usePaged';

const { filters, list, total, page, pageSize, loading, load, reload } = usePaged(api.leads, {
  status: undefined as LeadStatus | undefined,
});

async function save(row: LeadRow, patch: { status?: LeadStatus; remark?: string }) {
  Object.assign(row, await api.updateLead(row.id, patch));
  ElMessage.success('已保存');
}

onMounted(load);
</script>

<style scoped>
.pager {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
