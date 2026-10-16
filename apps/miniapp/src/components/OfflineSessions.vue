<template>
  <view class="card">
    <view class="section-title">选择场次</view>
    <view v-if="loaded && !sessions.length" class="muted empty">暂无可报名的场次，敬请期待</view>
    <view
      v-for="s in sessions"
      :key="s.id"
      :class="['session', { active: selected?.id === s.id, disabled: !canPick(s) }]"
      @click="canPick(s) && (selected = s)"
    >
      <view class="row">
        <text class="s-title">{{ s.title }}</text>
        <text v-if="s.myEnrollment" class="badge mine">{{ EnrollmentStatusLabel[s.myEnrollment.status] }}</text>
        <text v-else-if="s.closed" class="badge">报名已截止</text>
        <text v-else-if="!s.remaining" class="badge">已满</text>
        <text v-else class="muted">剩 {{ s.remaining }} 席</text>
      </view>
      <view class="muted line">{{ timeRange(s.startAt, s.endAt) }}</view>
      <view class="muted line">{{ s.address }}</view>
      <view class="line">
        <text class="price">定金 ¥{{ yuan(s.depositCent) }}</text>
        <text v-if="s.balanceCent" class="muted"> · 尾款 ¥{{ yuan(s.balanceCent) }}（{{ shortDate(s.balanceDueAt) }} 前付清）</text>
      </view>
    </view>
  </view>

  <view v-if="sessions.length" class="bar">
    <button v-if="selected?.myEnrollment" class="btn-primary" @click="goMine">查看我的报名</button>
    <button v-else class="btn-primary" :disabled="!selected" @click="sheet = true">
      {{ selected ? `报名并支付定金 ¥${yuan(selected.depositCent)}` : '请选择场次' }}
    </button>
  </view>

  <view v-if="sheet && selected" class="mask" @click="sheet = false" />
  <view v-if="sheet && selected" class="sheet">
    <view class="sheet-title">报名信息</view>
    <view class="muted">{{ selected.title }} · {{ timeRange(selected.startAt, selected.endAt) }}</view>
    <view class="label">联系人</view>
    <input v-model="form.name" class="input" maxlength="32" placeholder="参课人姓名" />
    <view class="label">手机号</view>
    <input v-model="form.phone" class="input" type="number" maxlength="11" placeholder="用于开课通知" />
    <view class="muted tip">定金支付后为你保留名额；尾款需在 {{ shortDate(selected.balanceDueAt) }} 前付清。</view>
    <button class="btn-primary" :loading="submitting" :disabled="!formValid" @click="submit">支付定金 ¥{{ yuan(selected.depositCent) }}</button>
  </view>
</template>

<script setup lang="ts">
import { EnrollmentStatusLabel } from '@luoji/shared';
import { computed, reactive, ref, watch } from 'vue';
import { api, type OfflineSessionView } from '@/api';
import { shortDate, yuan } from '@/utils/format';
import { payOrder } from '@/utils/pay';

const props = defineProps<{ productId: string; refreshKey: number }>();

const sessions = ref<OfflineSessionView[]>([]);
const loaded = ref(false);
const selected = ref<OfflineSessionView | null>(null);
const sheet = ref(false);
const submitting = ref(false);
const form = reactive({ name: '', phone: '' });
const formValid = computed(() => !!form.name.trim() && /^1\d{10}$/.test(form.phone));

const canPick = (s: OfflineSessionView) => !!s.myEnrollment || (!s.closed && s.remaining > 0);

function timeRange(start: string, end: string) {
  const a = new Date(start);
  const b = new Date(end);
  const p = (n: number) => String(n).padStart(2, '0');
  const day = (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日`;
  const hm = (d: Date) => `${p(d.getHours())}:${p(d.getMinutes())}`;
  return a.toDateString() === b.toDateString() ? `${day(a)} ${hm(a)}-${hm(b)}` : `${day(a)} ${hm(a)} - ${day(b)} ${hm(b)}`;
}

async function load() {
  sessions.value = await api.offlineSessions(props.productId);
  loaded.value = true;
  // 刷新后保持选中；默认选第一个可报名的场次
  selected.value = sessions.value.find((s) => s.id === selected.value?.id) ?? sessions.value.find(canPick) ?? null;
}

async function submit() {
  if (!selected.value) return;
  submitting.value = true;
  try {
    const res = await api.enroll(selected.value.id, { name: form.name.trim(), phone: form.phone });
    sheet.value = false;
    const paid = await payOrder(res.orderNo, res.payCent);
    uni.showToast({ title: paid ? '报名成功' : '名额已保留 30 分钟，请尽快支付', icon: paid ? 'success' : 'none' });
    await load();
  } catch {
    /* 错误提示已在 request 中处理 */
  } finally {
    submitting.value = false;
  }
}

const goMine = () => uni.navigateTo({ url: '/pages/offline/mine' });

// 父页面每次 onShow 递增 refreshKey（例如从「我的报名」返回），重新拉取名额与报名状态
watch(
  () => props.refreshKey,
  () => load().catch(() => undefined),
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.section-title {
  font-size: 30rpx;
  font-weight: 600;
  margin-bottom: 12rpx;
}
.empty {
  padding: 24rpx 0;
}
.session {
  padding: 24rpx;
  margin-top: 16rpx;
  border-radius: 12rpx;
  border: 2rpx solid #eef1ef;
  &.active {
    border-color: $brand;
    background: $brand-light;
  }
  &.disabled {
    opacity: 0.5;
  }
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.s-title {
  font-weight: 600;
}
.line {
  margin-top: 8rpx;
}
.badge {
  font-size: 22rpx;
  color: $text-secondary;
  &.mine {
    color: $brand;
  }
}
.bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.04);
  z-index: 5;
}
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 10;
}
.sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 11;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 32rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
}
.sheet-title {
  text-align: center;
  font-size: 32rpx;
  font-weight: 600;
  margin-bottom: 12rpx;
}
.label {
  margin: 24rpx 0 12rpx;
}
.input {
  height: 80rpx;
  padding: 0 20rpx;
  border-radius: 12rpx;
  background: $bg;
}
.tip {
  margin: 20rpx 0;
  line-height: 1.6;
}
</style>
