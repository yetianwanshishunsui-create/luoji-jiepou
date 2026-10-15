<template>
  <el-drawer :model-value="modelValue" title="订单详情" size="640px" @update:model-value="emit('update:modelValue', $event)" @open="load">
    <div v-loading="loading">
      <template v-if="order">
        <div class="head">
          <el-tag :type="OrderStatusTag[order.status]">{{ OrderStatusLabel[order.status] }}</el-tag>
          <span class="order-no">{{ order.orderNo }}</span>
          <el-button v-if="refundable > 0 && canRefund" type="danger" plain size="small" class="refund-btn" @click="openRefund">
            退款
          </el-button>
        </div>

        <el-descriptions :column="2" border size="small" class="block">
          <el-descriptions-item label="用户">
            {{ order.user.nickname || '未设置昵称' }}（{{ order.user.phoneMasked || '未绑定手机' }}）
          </el-descriptions-item>
          <el-descriptions-item label="身份">{{ order.user.identityType ? IdentityTypeLabel[order.user.identityType] : '—' }}</el-descriptions-item>
          <el-descriptions-item label="订单类型">{{ OrderPurposeLabel[order.purpose] }}</el-descriptions-item>
          <el-descriptions-item label="优惠券">{{ order.coupon?.name ?? '—' }}</el-descriptions-item>
          <el-descriptions-item label="订单金额">¥{{ yuan(order.totalCent) }}</el-descriptions-item>
          <el-descriptions-item label="优惠">¥{{ yuan(order.discountCent) }}</el-descriptions-item>
          <el-descriptions-item label="实付">
            <b>¥{{ yuan(order.payCent) }}</b>
          </el-descriptions-item>
          <el-descriptions-item label="已退款">
            <span :class="{ refund: order.refundedCent }">¥{{ yuan(order.refundedCent) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="下单时间">{{ fmtTime(order.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="支付时间">{{ fmtTime(order.paidAt) }}</el-descriptions-item>
          <el-descriptions-item v-if="order.closedAt" label="关闭时间">{{ fmtTime(order.closedAt) }}</el-descriptions-item>
          <el-descriptions-item v-if="order.status === 'CREATED'" label="支付截止">{{ fmtTime(order.expireAt) }}</el-descriptions-item>
          <el-descriptions-item label="微信支付单号" :span="2">{{ order.wxTransactionId ?? '—' }}</el-descriptions-item>
        </el-descriptions>

        <div class="section-title">商品</div>
        <el-table :data="order.items" size="small">
          <el-table-column prop="title" label="商品" />
          <el-table-column label="类型" width="80">
            <template #default="{ row }">{{ ProductTypeLabel[row.product.type as ProductType] }}</template>
          </el-table-column>
          <el-table-column label="单价" width="100" align="right">
            <template #default="{ row }">¥{{ yuan(row.priceCent) }}</template>
          </el-table-column>
          <el-table-column label="学习权益" width="90">
            <template #default="{ row }">
              <el-tag v-if="order.entitlements.some((e) => e.productId === row.productId)" size="small" type="success">已开通</el-tag>
              <span v-else class="muted">—</span>
            </template>
          </el-table-column>
        </el-table>

        <div class="section-title">退款记录</div>
        <el-table :data="order.refunds" size="small" empty-text="无">
          <el-table-column label="金额" width="90" align="right">
            <template #default="{ row }">¥{{ yuan(row.amountCent) }}</template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tooltip v-if="row.failReason" :content="row.failReason">
                <el-tag size="small" :type="RefundStatusTag[row.status as RefundStatus]">{{ RefundStatusLabel[row.status as RefundStatus] }}</el-tag>
              </el-tooltip>
              <el-tag v-else size="small" :type="RefundStatusTag[row.status as RefundStatus]">{{ RefundStatusLabel[row.status as RefundStatus] }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="原因" min-width="120">
            <template #default="{ row }">
              {{ row.reason }}
              <el-tag v-if="row.revokeEntitlement" size="small" type="info">收回权益</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="operatorName" label="操作人" width="90" />
          <el-table-column label="申请时间" width="140">
            <template #default="{ row }">{{ fmtShort(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column v-if="canRefund" width="70">
            <template #default="{ row }">
              <el-button v-if="row.status === 'PROCESSING'" link type="primary" @click="sync(row.refundNo)">同步</el-button>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </div>

    <el-dialog v-model="refundDialog" title="订单退款" width="460px" append-to-body>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="96px">
        <el-form-item label="可退金额">¥{{ yuan(refundable) }}</el-form-item>
        <el-form-item label="退款金额" prop="amountCent">
          <MoneyInput v-model="form.amountCent" :max="refundable" />
        </el-form-item>
        <el-form-item label="退款原因" prop="reason">
          <el-select v-model="form.reason" filterable allow-create default-first-option placeholder="选择或输入原因" style="width: 100%">
            <el-option v-for="r in reasons" :key="r" :label="r" :value="r" />
          </el-select>
        </el-form-item>
        <el-form-item label="学习权益">
          <el-checkbox v-model="form.revokeEntitlement">退款成功后收回课程学习权限</el-checkbox>
        </el-form-item>
        <el-alert type="warning" :closable="false" show-icon title="退款将原路退回至用户微信，提交后不可撤销；使用的优惠券不退回。" />
      </el-form>
      <template #footer>
        <el-button @click="refundDialog = false">取消</el-button>
        <el-button type="danger" :loading="submitting" @click="submitRefund">确认退款 ¥{{ yuan(form.amountCent ?? 0) }}</el-button>
      </template>
    </el-dialog>
  </el-drawer>
</template>

<script setup lang="ts">
import {
  IdentityTypeLabel,
  OrderPurposeLabel,
  OrderStatusLabel,
  ProductTypeLabel,
  RefundStatusLabel,
  type ProductType,
  type RefundStatus,
} from '@luoji/shared';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { computed, reactive, ref, watch } from 'vue';
import { orderApi, type OrderDetail } from '@/api/order';
import MoneyInput from '@/components/MoneyInput.vue';
import { fmtShort, fmtTime, yuan } from '@/utils/format';
import { OrderStatusTag, RefundStatusTag } from './status';

const props = defineProps<{ modelValue: boolean; orderNo: string; canRefund: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [boolean]; changed: [] }>();

const order = ref<OrderDetail>();
const loading = ref(false);

/** 只有已支付（含部分退款）的订单可退 */
const refundable = computed(() => (order.value?.status === 'PAID' ? order.value.payCent - order.value.refundedCent : 0));

async function load() {
  if (!props.orderNo) return;
  loading.value = true;
  try {
    order.value = await orderApi.detail(props.orderNo);
  } finally {
    loading.value = false;
  }
}

async function sync(refundNo: string) {
  await orderApi.syncRefund(refundNo);
  ElMessage.success('已同步');
  await load();
  emit('changed');
}

// ───────── 退款 ─────────
const reasons = ['学员申请退款', '重复购买', '课程内容问题', '协商部分退款'];
const refundDialog = ref(false);
const submitting = ref(false);
const formRef = ref<FormInstance>();
const form = reactive({ amountCent: null as number | null, reason: '', revokeEntitlement: true });
const rules: FormRules = {
  amountCent: [
    {
      validator: (_r, v: number | null, cb) =>
        !v || v <= 0 ? cb(new Error('请输入退款金额')) : v > refundable.value ? cb(new Error('超过可退金额')) : cb(),
    },
  ],
  reason: [{ required: true, whitespace: true, message: '请填写退款原因' }],
};

// 全额退款默认收回权益；部分退款默认保留
watch(
  () => form.amountCent,
  (v) => (form.revokeEntitlement = v === refundable.value),
);

function openRefund() {
  Object.assign(form, { amountCent: refundable.value, reason: '', revokeEntitlement: true });
  refundDialog.value = true;
  formRef.value?.clearValidate();
}

async function submitRefund() {
  if (!(await formRef.value?.validate().catch(() => false))) return;
  submitting.value = true;
  try {
    const r = await orderApi.refund(props.orderNo, { amountCent: form.amountCent!, reason: form.reason, revokeEntitlement: form.revokeEntitlement });
    ElMessage.success(r.status === 'SUCCESS' ? '退款成功' : '退款已提交，等待微信处理');
    refundDialog.value = false;
  } finally {
    submitting.value = false;
    // 失败时退款单也会记录为“退款失败”，需要刷新
    await load();
    emit('changed');
  }
}
</script>

<style scoped>
.head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.order-no {
  font-family: ui-monospace, monospace;
  font-size: 15px;
}
.refund-btn {
  margin-left: auto;
}
.block {
  margin-bottom: 8px;
}
.section-title {
  margin: 20px 0 8px;
  font-weight: 600;
}
.refund {
  color: #d4380d;
}
.muted {
  color: var(--el-text-color-secondary);
}
</style>
