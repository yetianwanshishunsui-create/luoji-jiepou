<template>
  <el-card shadow="never">
    <el-form inline @submit.prevent="reload">
      <el-form-item label="操作人">
        <el-select v-model="filters.adminId" clearable filterable placeholder="全部" style="width: 140px" @change="reload">
          <el-option v-for="a in admins" :key="a.id" :label="a.name" :value="a.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="操作">
        <el-select v-model="filters.action" clearable filterable placeholder="全部" style="width: 180px" @change="reload">
          <el-option v-for="a in actions" :key="a.action" :label="`${actionLabel(a.action)}（${a.count}）`" :value="a.action" />
        </el-select>
      </el-form-item>
      <el-form-item label="对象">
        <el-input v-model="filters.target" clearable placeholder="订单号 / ID" style="width: 180px" @clear="reload" />
      </el-form-item>
      <el-form-item label="时间">
        <el-date-picker v-model="range" type="daterange" start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" style="width: 240px" @change="reload" />
      </el-form-item>
      <el-form-item>
        <el-button icon="Search" native-type="submit">查询</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column label="时间" width="160">
        <template #default="{ row }">{{ fmtTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作人" width="120">
        <template #default="{ row }">{{ row.admin?.name ?? '—' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="150">
        <template #default="{ row }">
          <el-tag size="small" :type="row.action.includes('DELETE') || row.action.includes('FAIL') || row.action === 'ORDER_REFUND' ? 'danger' : 'info'">
            {{ actionLabel(row.action) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="对象" width="230">
        <template #default="{ row }">
          <span class="mono">{{ row.target ?? '—' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="详情" min-width="240">
        <template #default="{ row }">
          <span class="detail">{{ detailText(row.detail) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="IP" width="130">
        <template #default="{ row }">{{ row.ip ?? '—' }}</template>
      </el-table-column>
    </el-table>

    <el-pagination v-model:current-page="page" class="pager" layout="total, prev, pager, next" :total="total" :page-size="pageSize" @current-change="load" />
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { AuditActionLabel, systemApi, type AdminAccount, type AuditLog } from '@/api/system';
import { usePaged } from '@/composables/usePaged';
import { fmtTime } from '@/utils/format';

const admins = ref<AdminAccount[]>([]);
const actions = ref<{ action: string; count: number }[]>([]);
const range = ref<[string, string] | null>(null);

const actionLabel = (a: string) => AuditActionLabel[a] ?? a;

/** detail 以 key=value 形式展示，过长截断 */
function detailText(detail: AuditLog['detail']) {
  if (!detail || !Object.keys(detail).length) return '—';
  const text = Object.entries(detail)
    .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join('，');
  return text.length > 200 ? `${text.slice(0, 200)}…` : text;
}

const { filters, list, total, page, pageSize, loading, load, reload } = usePaged(
  (p: Parameters<typeof systemApi.auditLogs>[0]) => {
    const [from, to] = range.value ?? [];
    return systemApi.auditLogs({
      ...p,
      target: p.target?.trim() || undefined,
      from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
      to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
    });
  },
  { adminId: undefined as string | undefined, action: undefined as string | undefined, target: undefined as string | undefined },
);

onMounted(async () => {
  load();
  [admins.value, actions.value] = await Promise.all([systemApi.admins(), systemApi.auditActions()]);
});
</script>

<style scoped>
.mono {
  font-family: ui-monospace, monospace;
  font-size: 12px;
}
.detail {
  font-size: 12px;
  color: var(--el-text-color-regular);
  word-break: break-all;
}
.pager {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
