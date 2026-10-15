<template>
  <view :class="['coupon', { dim }]">
    <view class="left">
      <view class="amount"><text class="unit">¥</text>{{ yuan(coupon.discountCent) }}</view>
      <view class="cond">{{ couponCondition(coupon) }}</view>
    </view>
    <view class="right">
      <view class="name">{{ coupon.name }}</view>
      <view v-if="coupon.description" class="desc">{{ coupon.description }}</view>
      <view class="valid">{{ validText }}</view>
      <view v-if="note" class="note">{{ note }}</view>
    </view>
    <view class="action">
      <slot />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CouponView } from '@/api';
import { couponCondition, shortDate, yuan } from '@/utils/format';

const props = defineProps<{ coupon: CouponView & { validFrom?: string }; dim?: boolean; note?: string | null }>();

const validText = computed(() =>
  props.coupon.validFrom ? `${shortDate(props.coupon.validFrom)} - ${shortDate(props.coupon.validTo)}` : `${shortDate(props.coupon.validTo)} 前有效`,
);
</script>

<style lang="scss" scoped>
.coupon {
  display: flex;
  align-items: stretch;
  background: #fff;
  border-radius: $radius;
  margin: 20rpx 24rpx;
  overflow: hidden;
  &.dim {
    opacity: 0.55;
  }
}
.left {
  width: 200rpx;
  flex-shrink: 0;
  background: linear-gradient(135deg, #e8553e, #f08c4a);
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24rpx 0;
}
.amount {
  font-size: 52rpx;
  font-weight: 700;
}
.unit {
  font-size: 26rpx;
  margin-right: 4rpx;
}
.cond {
  font-size: 22rpx;
  margin-top: 4rpx;
}
.right {
  flex: 1;
  padding: 20rpx 24rpx;
  min-width: 0;
}
.name {
  font-weight: 600;
}
.desc,
.valid {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: $text-secondary;
}
.note {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #d4380d;
}
.action {
  display: flex;
  align-items: center;
  padding-right: 24rpx;
}
</style>
