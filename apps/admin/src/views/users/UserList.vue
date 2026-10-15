<template>
  <el-card shadow="never">
    <el-form inline>
      <el-form-item label="认证状态">
        <el-select v-model="filters.certStatus" clearable placeholder="全部" style="width: 140px" @change="reload">
          <el-option v-for="(label, value) in CertStatusLabel" :key="value" :label="label" :value="value" />
        </el-select>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column label="用户" min-width="180">
        <template #default="{ row }">
          <div class="user">
            <el-avatar :src="row.avatar ?? undefined" :size="28">{{ row.nickname?.[0] ?? '?' }}</el-avatar>
            {{ row.nickname || '未设置昵称' }}
          </div>
        </template>
      </el-table-column>
      <el-table-column label="用户 ID" width="230">
        <template #default="{ row }">
          <span class="uid">{{ row.id }}</span>
          <el-button link icon="CopyDocument" @click="copy(row.id)" />
        </template>
      </el-table-column>
      <el-table-column prop="phoneMasked" label="手机号" width="130" />
      <el-table-column label="身份" width="100">
        <template #default="{ row }">{{ row.identityType ? IdentityTypeLabel[row.identityType as IdentityType] : '—' }}</template>
      </el-table-column>
      <el-table-column label="认证" width="100">
        <template #default="{ row }">{{ CertStatusLabel[row.certStatus as CertStatus] }}</template>
      </el-table-column>
      <el-table-column label="注册时间" width="170">
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
import { CertStatusLabel, IdentityTypeLabel, type CertStatus, type IdentityType } from '@luoji/shared';
import { ElMessage } from 'element-plus';
import { onMounted } from 'vue';
import { api } from '@/api';
import { usePaged } from '@/composables/usePaged';

const { filters, list, total, page, pageSize, loading, load, reload } = usePaged(api.users, {
  certStatus: undefined as CertStatus | undefined,
});

async function copy(text: string) {
  await navigator.clipboard.writeText(text);
  ElMessage.success('已复制');
}

onMounted(load);
</script>

<style scoped>
.pager {
  margin-top: 16px;
  justify-content: flex-end;
}
.uid {
  font-family: ui-monospace, monospace;
  font-size: 12px;
}
.user {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
