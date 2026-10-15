<template>
  <el-drawer :model-value="modelValue" :title="data ? `报名名单 · ${data.session.title}` : '报名名单'" size="980px" @update:model-value="emit('update:modelValue', $event)" @open="load()">
    <div v-loading="loading">
      <div v-if="data" class="summary">
        <span>名额 {{ data.session.quota }}，已占 <b>{{ active }}</b>，剩余 <b>{{ Math.max(0, data.session.quota - active) }}</b></span>
        <el-tag v-for="(label, s) in EnrollmentStatusLabel" :key="s" size="small" :type="StatusTag[s]">{{ label }} {{ data.counts[s] ?? 0 }}</el-tag>
        <el-button icon="Download" size="small" class="export" :loading="exporting" @click="exportCsv">导出名单</el-button>
      </div>

      <el-radio-group v-model="status" size="small" class="filter" @change="load()">
        <el-radio-button value="">全部</el-radio-button>
        <el-radio-button v-for="(label, s) in EnrollmentStatusLabel" :key="s" :value="s">{{ label }}</el-radio-button>
      </el-radio-group>

      <el-table :data="data?.list ?? []" size="small" empty-text="暂无报名">
        <el-table-column label="联系人" width="100" prop="contactName" fixed="left" />
        <el-table-column label="手机号" width="150">
          <template #default="{ row }">
            <span>{{ phones[row.id] ?? row.contactPhoneMasked }}</span>
            <el-button v-if="!phones[row.id]" link type="primary" size="small" @click="reveal(row as EnrollmentRow)">查看</el-button>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="StatusTag[row.status as EnrollmentStatus]">{{ EnrollmentStatusLabel[row.status as EnrollmentStatus] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="定金 / 尾款订单" width="250">
          <template #default="{ row }">
            <div v-for="(o, i) in [row.depositOrder, row.balanceOrder]" :key="i" class="order-line">
              <template v-if="o">
                <span class="muted">{{ i === 0 ? '定' : '尾' }}</span>
                <el-link type="primary" underline="never" class="mono" @click="openOrder(o.orderNo)">{{ o.orderNo }}</el-link>
                <span class="muted">{{ OrderStatusLabel[o.status as OrderStatus] }}</span>
              </template>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="报名时间" width="130">
          <template #default="{ row }">{{ fmtMd(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="备注" min-width="140">
          <template #default="{ row }">
            <span class="muted">{{ row.cancelReason ?? '' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="70" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status !== 'CANCELLED'" link type="danger" @click="cancel(row as EnrollmentRow)">取消</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { EnrollmentStatusLabel, OrderStatusLabel, type EnrollmentStatus, type OrderStatus } from '@luoji/shared';
import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { offlineApi, type EnrollmentList, type EnrollmentRow } from '@/api/offline';
import { fmtMd } from '@/utils/format';

const props = defineProps<{ modelValue: boolean; sessionId: string }>();
const emit = defineEmits<{ 'update:modelValue': [boolean]; changed: [] }>();
const router = useRouter();

const StatusTag: Record<EnrollmentStatus, 'warning' | 'primary' | 'success' | 'info'> = {
  DEPOSIT_PENDING: 'warning',
  DEPOSIT_PAID: 'primary',
  COMPLETED: 'success',
  CANCELLED: 'info',
};

const data = ref<EnrollmentList>();
const loading = ref(false);
const status = ref<EnrollmentStatus | ''>('');
const phones = ref<Record<string, string>>({});
const active = computed(() => (['DEPOSIT_PENDING', 'DEPOSIT_PAID', 'COMPLETED'] as const).reduce((n, s) => n + (data.value?.counts[s] ?? 0), 0));

async function load() {
  loading.value = true;
  try {
    data.value = await offlineApi.enrollments(props.sessionId, status.value || undefined);
  } finally {
    loading.value = false;
  }
}

/** 完整手机号逐条查看（后端记录审计） */
async function reveal(row: EnrollmentRow) {
  phones.value[row.id] = (await offlineApi.phone(row.id)).phone;
}

async function cancel(row: EnrollmentRow) {
  const paid = row.status !== 'DEPOSIT_PENDING';
  const { value } = await ElMessageBox.prompt(
    paid ? '该学员已付款，取消后名额释放；退款需由财务在「订单」中处理。' : '取消后定金订单关闭，名额释放。',
    `取消「${row.contactName}」的报名`,
    { inputPlaceholder: '取消原因（必填）', inputValidator: (v) => !!v?.trim() || '请填写取消原因', type: 'warning' },
  );
  const res = await offlineApi.cancel(row.id, value.trim());
  ElMessage.success(res.needsRefund ? '已取消，如需退款请到订单页处理' : '已取消');
  await load();
  emit('changed');
}

function openOrder(orderNo: string) {
  router.push({ name: 'orders', query: { keyword: orderNo } });
}

const exporting = ref(false);
async function exportCsv() {
  exporting.value = true;
  try {
    await offlineApi.export(props.sessionId);
  } finally {
    exporting.value = false;
  }
}
</script>

<style scoped>
.summary {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.export {
  margin-left: auto;
}
.filter {
  margin-bottom: 12px;
}
.muted {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.order-line {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
.mono {
  font-family: ui-monospace, monospace;
  font-size: 12px;
}
</style>
