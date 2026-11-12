<template>
  <view :class="['item', `is-${layout}`]" @click="open">
    <view class="cover-box">
      <image v-if="product.cover" class="cover" :src="product.cover" mode="aspectFill" />
      <view v-else class="cover" />
      <text class="type">{{ ProductTypeLabel[product.type] }}</text>
    </view>
    <view class="info">
      <view class="title">
        <text v-if="product.priceRule" class="rule-tag">{{ product.priceRule.type === 'EARLY_BIRD' ? '早鸟' : '限时' }}</text>
        {{ product.title }}
      </view>
      <view v-if="product.keywords?.length" class="kws">
        <text v-for="k in product.keywords.slice(0, 2)" :key="k" class="kw-mini">{{ k }}</text>
      </view>
      <view v-else class="muted sub">{{ product.subtitle }}</view>
      <view class="bottom">
        <text v-if="product.type === 'OFFLINE'" class="price">{{ product.minDepositCent != null ? `定金 ${money(product.minDepositCent, product.pricePrefix)} 起` : '暂无场次' }}</text>
        <text v-else-if="product.pricingMode === 'FREE'" class="free">免费</text>
        <template v-else>
          <text class="price">{{ money(product.currentPriceCent, product.pricePrefix) }}</text>
          <text v-if="product.currentPriceCent < product.priceCent" class="origin">{{ money(product.priceCent, product.pricePrefix) }}</text>
        </template>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ProductTypeLabel } from '@luoji/shared';
import type { ProductCard } from '@/api';
import { money } from '@/utils/format';

/** row：左图右文（默认）；grid：上图下文，用于两列网格 */
const props = withDefaults(defineProps<{ product: ProductCard; layout?: 'row' | 'grid' }>(), { layout: 'row' });
const open = () => uni.navigateTo({ url: `/pages/course/detail?id=${props.product.id}` });
</script>

<style lang="scss" scoped>
.item {
  display: flex;
  gap: 24rpx;
  padding: 26rpx 0;
  border-bottom: 1rpx solid $line;
  &:last-child {
    border-bottom: none;
    padding-bottom: 4rpx;
  }
}
.cover-box {
  position: relative;
  flex-shrink: 0;
}
.cover {
  display: block;
  width: 236rpx;
  height: 158rpx;
  border-radius: 16rpx;
  background: $brand-light;
}
.type {
  position: absolute;
  right: 0;
  top: 0;
  padding: 2rpx 12rpx;
  border-radius: 0 16rpx 0 12rpx;
  background: rgba(20, 48, 111, 0.72);
  color: #fff;
  font-size: 20rpx;
}
.info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.title {
  font-size: 26rpx;
  font-weight: 600;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.rule-tag {
  display: inline-block;
  margin-right: 8rpx;
  padding: 0 10rpx;
  border-radius: 6rpx;
  background: linear-gradient(135deg, #ff7a45, $price);
  color: #fff;
  font-size: 20rpx;
  font-weight: 500;
  line-height: 32rpx;
  vertical-align: 2rpx;
}
.kws {
  margin-top: 10rpx;
  display: flex;
  gap: 10rpx;
  overflow: hidden;
}
.kw-mini {
  flex-shrink: 0;
  padding: 0 12rpx;
  border-radius: 6rpx;
  background: $brand-soft;
  color: #4f6ea8;
  font-size: 20rpx;
  line-height: 34rpx;
}
.sub {
  margin-top: 8rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.bottom {
  margin-top: auto;
}

/* ───── 两列网格 ───── */
.item.is-grid {
  flex-direction: column;
  gap: 0;
  padding: 0;
  border: none;
  border-radius: 20rpx;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 8rpx 28rpx rgba(20, 48, 111, 0.07);
  .cover-box {
    width: 100%;
  }
  .cover {
    width: 100%;
    height: 220rpx;
    border-radius: 0;
  }
  .type {
    border-radius: 0 0 0 12rpx;
  }
  .info {
    padding: 18rpx 20rpx 20rpx;
    min-height: 168rpx;
    box-sizing: border-box;
  }
  .title {
    font-size: 25rpx;
    line-height: 1.5;
  }
  .price,
  .free {
    font-size: 26rpx;
  }
  .kws {
    margin-top: 8rpx;
  }
  .sub {
    margin-top: 6rpx;
  }
  .bottom {
    padding-top: 10rpx;
  }
}
.free {
  color: $brand;
  font-weight: 600;
}
.origin {
  margin-left: 12rpx;
  color: $text-weak;
  font-size: 22rpx;
  text-decoration: line-through;
}
</style>
