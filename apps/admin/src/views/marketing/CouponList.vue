<template>
  <el-card shadow="never">
    <div class="toolbar">
      <el-form inline @submit.prevent="reload">
        <el-form-item label="状态">
          <el-select v-model="filters.phase" clearable placeholder="全部" style="width: 110px" @change="reload">
            <el-option label="进行中" value="active" />
            <el-option label="未开始" value="upcoming" />
            <el-option label="已结束" value="ended" />
            <el-option label="已停用" value="disabled" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-input v-model="filters.keyword" clearable placeholder="搜索名称" style="width: 180px" @clear="reload" />
        </el-form-item>
        <el-form-item>
          <el-button icon="Search" native-type="submit">查询</el-button>
        </el-form-item>
      </el-form>
      <el-button type="primary" icon="Plus" @click="openForm()">新建优惠券</el-button>
    </div>

    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column label="优惠券" min-width="200">
        <template #default="{ row }">
          <div class="name">
            {{ row.name }}
            <el-tag size="small" :type="phaseOf(row as Coupon).type">{{ phaseOf(row as Coupon).label }}</el-tag>
          </div>
          <div class="muted">{{ row.description || '—' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="面额 / 适用" width="160">
        <template #default="{ row }">
          <b class="face">{{ couponFace(row as Coupon) }}</b>
          <div class="muted">{{ CouponScopeLabel[row.scope as CouponScope] }}</div>
        </template>
      </el-table-column>
      <el-table-column label="有效期" width="200">
        <template #default="{ row }">
          <el-tooltip :content="`${fmtShort(row.validFrom)} ~ ${fmtShort(row.validTo)}`">
            <span>{{ fmtMd(row.validFrom) }} ~ {{ fmtMd(row.validTo) }}</span>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column label="使用 / 发放 / 总量" width="140">
        <template #default="{ row }">{{ row.usedCount }} / {{ row.issuedCount }} / {{ row.totalCount || '不限' }}</template>
      </el-table-column>
      <el-table-column label="领取方式" width="150">
        <template #default="{ row }">{{ row.claimable ? `用户领取 · 每人 ${row.perUserLimit} 张` : '定向发放' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="210" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openForm(row as Coupon)">编辑</el-button>
          <el-button link type="primary" :disabled="phaseOf(row as Coupon).label === '已结束' || !row.enabled" @click="openIssue(row as Coupon)">发放</el-button>
          <el-button link type="primary" @click="openRecords(row as Coupon)">记录</el-button>
          <el-button link :type="row.enabled ? 'warning' : 'success'" @click="toggle(row as Coupon)">{{ row.enabled ? '停用' : '启用' }}</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination v-model:current-page="page" class="pager" layout="total, prev, pager, next" :total="total" :page-size="pageSize" @current-change="load" />
  </el-card>

  <CouponDialog v-model="formDialog" :coupon-id="editingId" @saved="load" />

  <!-- 定向发放 -->
  <el-dialog v-model="issueDialog" :title="`发放「${current?.name ?? ''}」`" width="520px">
    <el-input v-model="targets" type="textarea" :rows="8" placeholder="每行一个：用户手机号（11 位）或用户 ID（可在“用户”页查看）" />
    <div class="muted issue-tip">共 {{ targetList.length }} 个对象；每个对象发放一张，不受每人限领限制</div>
    <el-alert v-if="issueResult" :type="issueResult.notFound.length || issueResult.quotaExhausted ? 'warning' : 'success'" :closable="false" class="issue-result">
      <template #title>已发放 {{ issueResult.issued }} 张{{ issueResult.quotaExhausted ? '，总量不足已停止' : '' }}</template>
      <div v-if="issueResult.notFound.length">未找到：{{ issueResult.notFound.join('、') }}</div>
    </el-alert>
    <template #footer>
      <el-button @click="issueDialog = false">关闭</el-button>
      <el-button type="primary" :loading="issuing" :disabled="!targetList.length" @click="issue">发放</el-button>
    </template>
  </el-dialog>

  <!-- 领用记录 -->
  <el-drawer v-model="recordsDrawer" :title="`领用记录 · ${current?.name ?? ''}`" size="620px">
    <el-radio-group v-model="recordStatus" size="small" class="record-tabs" @change="loadRecords(1)">
      <el-radio-button value="">全部</el-radio-button>
      <el-radio-button v-for="(label, value) in UserCouponStatusLabel" :key="value" :value="value">{{ label }}</el-radio-button>
    </el-radio-group>
    <el-table v-loading="recordsLoading" :data="records.list" size="small">
      <el-table-column label="用户" min-width="140">
        <template #default="{ row }">{{ row.user.nickname || '未设置昵称' }}（{{ row.user.phoneMasked || '—' }}）</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">{{ UserCouponStatusLabel[row.status as UserCouponStatus] }}</template>
      </el-table-column>
      <el-table-column label="领取时间" width="140">
        <template #default="{ row }">{{ fmtShort(row.claimedAt) }}</template>
      </el-table-column>
      <el-table-column label="使用订单" min-width="170">
        <template #default="{ row }">
          <el-link v-if="row.order" type="primary" underline="never" @click="router.push({ name: 'orders', query: { keyword: row.order.orderNo } })">
            {{ row.order.orderNo }}
          </el-link>
          <span v-else>—</span>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination class="pager" layout="total, prev, pager, next" :total="records.total" :page-size="20" @current-change="loadRecords" />
  </el-drawer>
</template>

<script setup lang="ts">
import type { PageResult } from '@luoji/shared';
import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  couponFace,
  CouponScopeLabel,
  marketingApi,
  phaseOf,
  UserCouponStatusLabel,
  type Coupon,
  type CouponRecord,
  type CouponScope,
  type UserCouponStatus,
} from '@/api/marketing';
import { usePaged } from '@/composables/usePaged';
import { fmtMd, fmtShort } from '@/utils/format';
import CouponDialog from './CouponDialog.vue';

const router = useRouter();
const { filters, list, total, page, pageSize, loading, load, reload } = usePaged(marketingApi.coupons, {
  phase: undefined as string | undefined,
  keyword: undefined as string | undefined,
});

const current = ref<Coupon>();

// ───────── 新建 / 编辑 ─────────
const formDialog = ref(false);
const editingId = ref<string>();
function openForm(row?: Coupon) {
  editingId.value = row?.id;
  formDialog.value = true;
}

async function toggle(row: Coupon) {
  if (row.enabled) {
    await ElMessageBox.confirm('停用后用户无法领取，已领取未使用的券也不能再用于下单。确定停用？', '停用优惠券', { type: 'warning' });
  }
  await marketingApi.setCouponEnabled(row.id, !row.enabled);
  ElMessage.success(row.enabled ? '已停用' : '已启用');
  load();
}

// ───────── 发放 ─────────
const issueDialog = ref(false);
const issuing = ref(false);
const targets = ref('');
const issueResult = ref<{ issued: number; notFound: string[]; quotaExhausted: boolean }>();
const targetList = computed(() => [...new Set(targets.value.split(/[\s,，;；]+/).map((t) => t.trim()).filter(Boolean))]);

function openIssue(row: Coupon) {
  current.value = row;
  targets.value = '';
  issueResult.value = undefined;
  issueDialog.value = true;
}

async function issue() {
  if (!current.value) return;
  issuing.value = true;
  try {
    issueResult.value = await marketingApi.issueCoupon(current.value.id, targetList.value);
    load();
  } finally {
    issuing.value = false;
  }
}

// ───────── 领用记录 ─────────
const recordsDrawer = ref(false);
const recordsLoading = ref(false);
const recordStatus = ref<UserCouponStatus | ''>('');
const records = ref<PageResult<CouponRecord>>({ list: [], total: 0, page: 1, pageSize: 20 });

function openRecords(row: Coupon) {
  current.value = row;
  recordStatus.value = '';
  recordsDrawer.value = true;
  loadRecords(1);
}

async function loadRecords(p: number) {
  if (!current.value) return;
  recordsLoading.value = true;
  try {
    records.value = await marketingApi.couponRecords(current.value.id, { page: p, pageSize: 20, status: recordStatus.value || undefined });
  } finally {
    recordsLoading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
}
.name {
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}
.face {
  color: #d4380d;
}
.muted {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.issue-tip {
  margin-top: 8px;
}
.issue-result {
  margin-top: 12px;
}
.record-tabs {
  margin-bottom: 12px;
}
.pager {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
