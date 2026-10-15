<template>
  <view>
    <view class="tabs">
      <view v-for="t in tabs" :key="t.value" :class="['tab', { active: tab === t.value }]" @click="switchTab(t.value)">{{ t.label }}</view>
    </view>

    <CouponCard v-for="c in list" :key="c.id" :coupon="c" :dim="tab !== 'usable'" :note="c.status === 'LOCKED' ? '有待支付订单正在使用' : null">
      <text v-if="tab === 'usable' && c.status === 'UNUSED'" class="use" @click="goUse">去使用</text>
      <text v-else-if="tab === 'used'" class="muted">已使用</text>
      <text v-else-if="tab === 'expired'" class="muted">已过期</text>
    </CouponCard>

    <view v-if="loaded && !list.length" class="muted empty">{{ tab === 'usable' ? '暂无可用优惠券' : '暂无记录' }}</view>
    <view v-if="tab === 'usable'" class="link" @click="goCenter">去领券中心 ›</view>
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { ref } from 'vue';
import { api, type MyCoupon } from '@/api';
import CouponCard from '@/components/CouponCard.vue';

type Tab = 'usable' | 'used' | 'expired';
const tabs: { label: string; value: Tab }[] = [
  { label: '可使用', value: 'usable' },
  { label: '已使用', value: 'used' },
  { label: '已过期', value: 'expired' },
];
const tab = ref<Tab>('usable');
const list = ref<MyCoupon[]>([]);
const loaded = ref(false);

async function load() {
  loaded.value = false;
  list.value = await api.myCoupons(tab.value);
  loaded.value = true;
}

function switchTab(t: Tab) {
  tab.value = t;
  load();
}

const goUse = () => uni.switchTab({ url: '/pages/course/list' });
const goCenter = () => uni.navigateTo({ url: '/pages/coupon/center' });

onShow(() => load().catch(() => undefined));
</script>

<style lang="scss" scoped>
.tabs {
  display: flex;
  background: #fff;
}
.tab {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  color: $text-secondary;
  &.active {
    color: $brand;
    font-weight: 600;
    border-bottom: 4rpx solid $brand;
  }
}
.use {
  color: #e8553e;
  font-size: 26rpx;
}
.empty {
  text-align: center;
  padding: 80rpx 0;
}
.link {
  text-align: center;
  color: $brand;
  padding: 32rpx 0 60rpx;
}
</style>
