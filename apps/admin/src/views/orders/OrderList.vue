<template>
  <el-card shadow="never">
    <div class="toolbar">
      <el-form inline class="filters" @submit.prevent="reload">
        <el-form-item>
          <el-input v-model="filters.keyword" clearable placeholder="订单号 / 手机号 / 课程名" style="width: 220px" @clear="reload" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" clearable placeholder="全部" style="width: 110px" @change="reload">
            <el-option v-for="(label, value) in OrderStatusLabel" :key="value" :label="label" :value="value" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="filters.purpose" clearable placeholder="全部" style="width: 120px" @change="reload">
            <el-option v-for="(label, value) in OrderPurposeLabel" :key="value" :label="label" :value="value" />
          </el-select>
        </el-form-item>
        <el-form-item label="下单时间">
          <el-date-picker
            v-model="range"
            type="daterange"
            start-placeholder="开始"
            end-placeholder="结束"
            value-format="YYYY-MM-DD"
            style="width: 240px"
            @change="reload"
          />
        </el-form-item>
        <el-form-item>
          <el-button icon="Search" native-type="submit">查询</el-button>
        </el-form-item>
      </el-form>
      <el-button v-if="canRefund" icon="Download" :loading="exporting" @click="exportCsv">导出</el-button>
    </div>

    <div v-if="summary" class="summary">
      <div>
        <span class="label">支付笔数</span><b>{{ summary.paidCount }}</b>
      </div>
      <div>
        <span class="label">收款</span><b>¥{{ yuan(summary.paidCent) }}</b>
      </div>
      <div>
        <span class="label">退款</span><b class="refund">¥{{ yuan(summary.refundedCent) }}</b>
      </div>
      <div>
        <span class="label">净收入</span><b>¥{{ yuan(summary.paidCent - summary.refundedCent) }}</b>
      </div>
      <span class="hint">按当前筛选条件统计已支付过的订单</span>
    </div>

    <el-table v-loading="loading" :data="list" stripe @row-click="(row: OrderRow) => open(row.orderNo)">
      <el-table-column prop="orderNo" label="订单号" width="190" />
      <el-table-column label="商品" min-width="200">
        <template #default="{ row }">
          <div>{{ (row as OrderRow).items.map((i) => i.title).join('、') }}</div>
          <div v-if="row.purpose !== 'PRODUCT'" class="muted">{{ OrderPurposeLabel[row.purpose as OrderPurpose] }}</div>
        </template>
      </el-table-column>
      <el-table-column label="用户" width="150">
        <template #default="{ row }">
          <div>{{ row.user.nickname || '未设置昵称' }}</div>
          <div class="muted">{{ row.user.phoneMasked || '—' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="实付" width="110" align="right">
        <template #default="{ row }">
          <div>¥{{ yuan(row.payCent) }}</div>
          <div v-if="row.discountCent" class="muted">优惠 ¥{{ yuan(row.discountCent) }}</div>
        </template>
      </el-table-column>
      <el-table-column label="已退款" width="100" align="right">
        <template #default="{ row }">
          <span v-if="row.refundedCent" class="refund">¥{{ yuan(row.refundedCent) }}</span>
          <span v-else class="muted">—</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="OrderStatusTag[row.status as OrderStatus]">{{ OrderStatusLabel[row.status as OrderStatus] }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="下单时间" width="150">
        <template #default="{ row }">{{ fmtShort(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="支付时间" width="150">
        <template #default="{ row }">{{ fmtShort(row.paidAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="80" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click.stop="open(row.orderNo)">详情</el-button>
        </template>
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

  <OrderDetailDrawer v-model="drawer" :order-no="current" :can-refund="canRefund" @changed="load" />
</template>

<script setup lang="ts">
import { OrderPurposeLabel, OrderStatusLabel, type OrderPurpose, type OrderStatus } from '@luoji/shared';
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { orderApi, type OrderQuery, type OrderRow, type OrderSummary } from '@/api/order';
import { usePaged } from '@/composables/usePaged';
import { canAccess } from '@/router';
import { useAuthStore } from '@/stores/auth';
import { fmtShort, yuan } from '@/utils/format';
import { OrderStatusTag } from './status';
import OrderDetailDrawer from './OrderDetailDrawer.vue';

const auth = useAuthStore();
const route = useRoute();
/** 退款与导出仅财务（及超级管理员） */
const canRefund = computed(() => canAccess(auth.admin?.role, ['FINANCE']));

const summary = ref<OrderSummary>();
const range = ref<[string, string] | null>(null);

const { filters, list, total, page, pageSize, loading, load, reload } = usePaged(
  async (p: OrderQuery) => {
    const res = await orderApi.list({ ...p, ...rangeParams() });
    summary.value = res.summary;
    return res;
  },
  {
    keyword: (route.query.keyword as string | undefined) ?? undefined,
    status: undefined as OrderStatus | undefined,
    purpose: undefined as OrderPurpose | undefined,
  },
);

/** 日期范围按本地时区的整天换算为时间点 */
function rangeParams() {
  if (!range.value) return {};
  const [from, to] = range.value;
  return { from: new Date(`${from}T00:00:00`).toISOString(), to: new Date(`${to}T23:59:59.999`).toISOString() };
}

const exporting = ref(false);
async function exportCsv() {
  exporting.value = true;
  try {
    await orderApi.export({ ...filters, ...rangeParams() });
  } finally {
    exporting.value = false;
  }
}

const drawer = ref(false);
const current = ref('');
function open(orderNo: string) {
  current.value = orderNo;
  drawer.value = true;
}

onMounted(load);
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.filters {
  flex: 1;
}
.summary {
  display: flex;
  align-items: baseline;
  gap: 32px;
  padding: 12px 16px;
  margin-bottom: 12px;
  background: #f6faf7;
  border-radius: 6px;
}
.summary .label {
  color: var(--el-text-color-secondary);
  font-size: 13px;
  margin-right: 8px;
}
.summary b {
  font-size: 18px;
}
.hint {
  margin-left: auto;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.refund {
  color: #d4380d;
}
.muted {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.pager {
  margin-top: 16px;
  justify-content: flex-end;
}
:deep(.el-table__row) {
  cursor: pointer;
}
</style>
