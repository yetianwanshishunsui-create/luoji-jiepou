<template>
  <view>
    <view class="banner">
      <view class="banner-title">领券中心</view>
      <view class="banner-sub">领取后在购买课程时自动推荐最优券</view>
    </view>

    <CouponCard v-for="c in list" :key="c.id" :coupon="c" :dim="!c.claimable && !c.heldCount" :note="c.claimable && c.heldCount ? `已领 ${c.heldCount} 张` : null">
      <button v-if="c.claimable" class="claim" size="mini" :loading="claiming === c.id" @click="claim(c)">领取</button>
      <text v-else-if="c.heldCount" class="held">已领取</text>
      <text v-else class="muted">{{ c.soldOut ? '已领完' : c.reason }}</text>
    </CouponCard>

    <view v-if="loaded && !list.length" class="muted empty">暂时没有可领取的优惠券</view>
    <view class="link" @click="goMine">查看我的优惠券 ›</view>
  </view>
</template>

<script setup lang="ts">
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app';
import { ref } from 'vue';
import { api, type CenterCoupon } from '@/api';
import CouponCard from '@/components/CouponCard.vue';

const list = ref<CenterCoupon[]>([]);
const loaded = ref(false);
const claiming = ref<string>();

async function load() {
  list.value = await api.couponCenter();
  loaded.value = true;
}

async function claim(c: CenterCoupon) {
  claiming.value = c.id;
  try {
    await api.claimCoupon(c.id);
    uni.showToast({ title: '领取成功', icon: 'success' });
    await load();
  } finally {
    claiming.value = undefined;
  }
}

const goMine = () => uni.navigateTo({ url: '/pages/coupon/mine' });

onShow(() => load().catch(() => undefined));
onPullDownRefresh(() => load().finally(() => uni.stopPullDownRefresh()));
</script>

<style lang="scss" scoped>
.banner {
  margin: 24rpx;
  padding: 40rpx 32rpx;
  border-radius: $radius;
  background: linear-gradient(135deg, #e8553e, #f08c4a);
  color: #fff;
}
.banner-title {
  font-size: 40rpx;
  font-weight: 600;
}
.banner-sub {
  margin-top: 8rpx;
  font-size: 24rpx;
  opacity: 0.9;
}
.claim {
  background: #e8553e !important;
  color: #fff !important;
  border-radius: 999rpx !important;
}
.held {
  color: #e8553e;
  font-size: 24rpx;
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
