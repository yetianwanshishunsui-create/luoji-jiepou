<template>
  <view>
    <view v-for="e in list" :key="e.id" class="card">
      <view class="head">
        <text class="title" @click="goProduct(e.product.id)">{{ e.product.title }}</text>
        <text :class="['status', e.status]">{{ statusText(e) }}</text>
      </view>
      <view class="muted line">{{ e.session.title }} · {{ fmtDateTime(e.session.startAt) }}</view>
      <view class="muted line">{{ e.session.address }}</view>
      <view class="muted line">联系人：{{ e.contactName }} {{ e.contactPhoneMasked }}</view>

      <view class="amounts">
        <text>{{ e.session.balanceCent ? '定金' : '全款' }} {{ money(e.session.depositCent, e.session.pricePrefix) }}</text>
        <text v-if="e.session.balanceCent"> · 尾款 {{ money(e.session.balanceCent, e.session.pricePrefix) }}</text>
      </view>
      <view v-if="e.status === 'DEPOSIT_PAID'" class="due">请在 {{ fmtDateTime(e.session.balanceDueAt) }} 前付清尾款</view>
      <view v-if="e.status === 'CANCELLED' && e.cancelReason" class="muted line">{{ e.cancelReason }}</view>

      <view class="actions">
        <template v-if="e.status === 'DEPOSIT_PENDING' && e.depositOrder">
          <button size="mini" class="plain" @click="cancel(e)">取消报名</button>
          <button size="mini" class="btn-primary" :loading="busy === e.id" @click="payDeposit(e)">支付定金</button>
        </template>
        <button v-if="e.status === 'DEPOSIT_PAID' && !balanceOverdue(e)" size="mini" class="btn-primary" :loading="busy === e.id" @click="payBalance(e)">
          支付尾款 {{ money(e.session.balanceCent, e.session.pricePrefix) }}
        </button>
        <text v-if="e.status === 'DEPOSIT_PAID' && balanceOverdue(e)" class="muted">尾款已逾期，请联系工作人员</text>
      </view>
    </view>
    <view v-if="loaded && !list.length" class="muted empty">还没有报名线下课</view>
  </view>
</template>

<script setup lang="ts">
import { EnrollmentStatusLabel } from '@luoji/shared';
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app';
import { ref } from 'vue';
import { api, type MyEnrollment } from '@/api';
import { money, yuan } from '@/utils/format';
import { payOrder } from '@/utils/pay';

const list = ref<MyEnrollment[]>([]);
const loaded = ref(false);
const busy = ref<string>();

async function load() {
  list.value = await api.myEnrollments();
  loaded.value = true;
}

function fmtDateTime(s: string) {
  const d = new Date(s);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}月${d.getDate()}日 ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const balanceOverdue = (e: MyEnrollment) => new Date(e.session.balanceDueAt).getTime() <= Date.now();

function statusText(e: MyEnrollment) {
  if (e.status === 'DEPOSIT_PAID' && !e.session.balanceCent) return '报名成功';
  return e.status === 'COMPLETED' ? '报名成功' : EnrollmentStatusLabel[e.status];
}

async function payDeposit(e: MyEnrollment) {
  busy.value = e.id;
  try {
    if (await payOrder(e.depositOrder!.orderNo, e.session.depositCent)) uni.showToast({ title: '定金已支付', icon: 'success' });
    await load();
  } finally {
    busy.value = undefined;
  }
}

async function payBalance(e: MyEnrollment) {
  busy.value = e.id;
  try {
    const order = await api.payBalance(e.id);
    if (await payOrder(order.orderNo, order.payCent)) uni.showToast({ title: '报名完成', icon: 'success' });
    await load();
  } catch {
    /* 错误提示已在 request 中处理 */
  } finally {
    busy.value = undefined;
  }
}

async function cancel(e: MyEnrollment) {
  const { confirm } = await uni.showModal({ title: '取消报名', content: '取消后名额将释放给其他学员，确定取消？' });
  if (!confirm) return;
  await api.cancelEnrollment(e.id);
  uni.showToast({ title: '已取消', icon: 'none' });
  await load();
}

const goProduct = (id: string) => uni.navigateTo({ url: `/pages/course/detail?id=${id}` });

onShow(() => load().catch(() => undefined));
onPullDownRefresh(() => load().finally(() => uni.stopPullDownRefresh()));
</script>

<style lang="scss" scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.title {
  font-weight: 600;
}
.status {
  font-size: 24rpx;
  color: $text-secondary;
  &.DEPOSIT_PENDING,
  &.DEPOSIT_PAID {
    color: #d4380d;
  }
  &.COMPLETED {
    color: $brand;
  }
}
.line {
  margin-top: 8rpx;
}
.amounts {
  margin-top: 16rpx;
}
.due {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #d4380d;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
  margin-top: 20rpx;
  &:empty {
    display: none;
  }
}
.plain {
  background: #fff;
  border: 1rpx solid #d9dedb;
}
.empty {
  text-align: center;
  padding: 120rpx 0;
}
</style>
