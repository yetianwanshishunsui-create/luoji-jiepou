<template>
  <view class="item" @click="open">
    <image v-if="product.cover" class="cover" :src="product.cover" mode="aspectFill" />
    <view v-else class="cover" />
    <view class="info">
      <view class="title">
        <text v-if="product.priceRule" class="rule-tag">{{ product.priceRule.type === 'EARLY_BIRD' ? '早鸟' : '限时' }}</text>
        {{ product.title }}
      </view>
      <view class="muted sub">{{ product.subtitle || ProductTypeLabel[product.type] }}</view>
      <view class="bottom">
        <text v-if="product.type === 'OFFLINE'" class="price">{{ product.minDepositCent != null ? `定金 ¥${yuan(product.minDepositCent)} 起` : '暂无场次' }}</text>
        <text v-else-if="product.pricingMode === 'FREE'" class="free">免费</text>
        <template v-else>
          <text class="price">¥{{ yuan(product.currentPriceCent) }}</text>
          <text v-if="product.currentPriceCent < product.priceCent" class="origin">¥{{ yuan(product.priceCent) }}</text>
        </template>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ProductTypeLabel } from '@luoji/shared';
import type { ProductCard } from '@/api';
import { yuan } from '@/utils/format';

const props = defineProps<{ product: ProductCard }>();
const open = () => uni.navigateTo({ url: `/pages/course/detail?id=${props.product.id}` });
</script>

<style lang="scss" scoped>
.item {
  display: flex;
  gap: 24rpx;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f0f2f1;
}
.cover {
  width: 220rpx;
  height: 150rpx;
  border-radius: 12rpx;
  background: $brand-light;
  flex-shrink: 0;
}
.info {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.title {
  font-weight: 600;
  line-height: 1.4;
}
.rule-tag {
  display: inline-block;
  margin-right: 8rpx;
  padding: 0 10rpx;
  border-radius: 6rpx;
  background: #d4380d;
  color: #fff;
  font-size: 20rpx;
  font-weight: 500;
  line-height: 32rpx;
  vertical-align: 2rpx;
}
.sub {
  margin-top: 8rpx;
}
.bottom {
  margin-top: auto;
}
.free {
  color: $brand;
  font-weight: 600;
}
.origin {
  margin-left: 12rpx;
  color: $text-secondary;
  font-size: 22rpx;
  text-decoration: line-through;
}
</style>
