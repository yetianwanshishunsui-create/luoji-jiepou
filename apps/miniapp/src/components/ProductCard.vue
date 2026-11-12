<template>
  <!-- event：线下课按日程展示（左侧日期）；list：文字在左、小封面在右 -->
  <view v-if="layout === 'event'" class="item event" @click="open">
    <view class="date">
      <template v-if="product.nextSession">
        <text class="day">{{ new Date(product.nextSession.startAt).getDate() }}</text>
        <text class="month">{{ new Date(product.nextSession.startAt).getMonth() + 1 }} 月</text>
      </template>
      <text v-else class="tbd">待定</text>
    </view>
    <view class="info">
      <view class="meta">{{ eventMeta }}</view>
      <view class="title">{{ product.title }}</view>
      <view class="bottom">
        <text class="price">{{ product.minDepositCent != null ? `定金 ${money(product.minDepositCent, product.pricePrefix)} 起` : '敬请期待' }}</text>
        <text v-if="product.priceRule" class="rule">{{ product.priceRule.type === 'EARLY_BIRD' ? '早鸟' : '限时' }}</text>
      </view>
    </view>
  </view>

  <view v-else class="item list" @click="open">
    <view class="info">
      <view class="meta">{{ listMeta }}</view>
      <view class="title">{{ product.title }}</view>
      <view class="bottom">
        <text v-if="product.type === 'OFFLINE'" class="price">{{ product.minDepositCent != null ? `定金 ${money(product.minDepositCent, product.pricePrefix)} 起` : '暂无场次' }}</text>
        <text v-else-if="product.pricingMode === 'FREE'" class="price free">免费</text>
        <template v-else>
          <text class="price">{{ money(product.currentPriceCent, product.pricePrefix) }}</text>
          <text v-if="product.currentPriceCent < product.priceCent" class="origin">{{ money(product.priceCent, product.pricePrefix) }}</text>
        </template>
        <text v-if="product.priceRule" class="rule">{{ product.priceRule.type === 'EARLY_BIRD' ? '早鸟' : '限时' }}</text>
      </view>
    </view>
    <image v-if="product.cover" class="thumb" :src="product.cover" mode="aspectFill" />
    <view v-else class="thumb" />
  </view>
</template>

<script setup lang="ts">
import { ProductTypeLabel } from '@luoji/shared';
import { computed } from 'vue';
import type { ProductCard } from '@/api';
import { money } from '@/utils/format';

const props = withDefaults(defineProps<{ product: ProductCard; layout?: 'list' | 'event' }>(), { layout: 'list' });
// 小字说明拼成一个字符串，便于单行省略（uni 的 text 组件默认允许换行）
const listMeta = computed(() => [ProductTypeLabel[props.product.type], ...(props.product.keywords ?? []).slice(0, 2)].join(' · '));
const eventMeta = computed(() => {
  const n = props.product.nextSession;
  return n ? `${n.title}${n.count > 1 ? ` 等 ${n.count} 场` : ''}` : '场次待公布';
});
const open = () => uni.navigateTo({ url: `/pages/course/detail?id=${props.product.id}` });
</script>

<style lang="scss" scoped>
.item {
  display: flex;
  align-items: stretch;
  gap: 24rpx;
  padding: 26rpx 0;
  border-bottom: 1rpx solid $line;
  &:last-child {
    border-bottom: none;
  }
}
.info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.meta {
  font-size: 20rpx;
  letter-spacing: 1rpx;
  color: $text-weak;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.title {
  margin-top: 6rpx;
  font-size: 26rpx;
  font-weight: 600;
  line-height: 1.5;
  color: $text;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.bottom {
  margin-top: auto;
  padding-top: 10rpx;
  display: flex;
  align-items: baseline;
  gap: 12rpx;
}
.price {
  font-size: 24rpx;
  font-weight: 600;
  color: $brand-deep;
  &.free {
    color: $brand;
  }
}
.origin {
  font-size: 20rpx;
  color: $text-weak;
  text-decoration: line-through;
}
.rule {
  padding: 0 10rpx;
  border-radius: 6rpx;
  border: 1rpx solid $brand;
  color: $brand;
  font-size: 18rpx;
  line-height: 28rpx;
}
.thumb {
  width: 176rpx;
  height: 118rpx;
  border-radius: 12rpx;
  flex-shrink: 0;
  background: $brand-light;
}

/* ───── 日程式（线下课） ───── */
.date {
  width: 104rpx;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12rpx 0;
  border-right: 1rpx solid $line;
  margin-right: 4rpx;
}
.day {
  font-family: 'Songti SC', 'STSong', 'Noto Serif SC', serif;
  font-size: 52rpx;
  font-weight: 700;
  line-height: 1;
  color: $brand-deep;
}
.month {
  margin-top: 8rpx;
  font-size: 20rpx;
  color: $text-secondary;
}
.tbd {
  font-size: 22rpx;
  color: $text-weak;
}
</style>
