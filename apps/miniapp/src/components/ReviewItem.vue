<template>
  <view class="review">
    <view class="head">
      <image v-if="review.avatar" :src="review.avatar" class="avatar" mode="aspectFill" />
      <view v-else class="avatar" />
      <view class="who">
        <view class="name">
          <text>{{ review.name }}</text>
          <text v-if="review.featured" class="tag">精选</text>
        </view>
        <view class="stars">
          <text v-for="n in 5" :key="n" :class="['star', { on: n <= review.rating }]">★</text>
        </view>
      </view>
      <text class="muted date">{{ shortDate(review.createdAt) }}</text>
    </view>
    <view :class="['content', { clamp }]">{{ review.content }}</view>
    <view v-if="review.reply" class="reply">
      <text class="reply-label">官方回复：</text>
      <text>{{ review.reply }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { ReviewView } from '@/api';
import { shortDate } from '@/utils/format';

defineProps<{ review: ReviewView; clamp?: boolean }>();
</script>

<style lang="scss" scoped>
.review {
  padding: 24rpx 0;
  border-bottom: 1rpx solid #edf0f5;
  &:last-child {
    border-bottom: none;
  }
}
.head {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: $brand-light;
  flex-shrink: 0;
}
.who {
  flex: 1;
}
.name {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 26rpx;
  font-weight: 500;
}
.tag {
  padding: 0 10rpx;
  border-radius: 6rpx;
  background: #fff4e5;
  color: #b45309;
  font-size: 20rpx;
}
.stars {
  margin-top: 4rpx;
}
.star {
  font-size: 24rpx;
  color: #d9dde6;
  margin-right: 4rpx;
  &.on {
    color: #f5a623;
  }
}
.date {
  align-self: flex-start;
}
.content {
  margin-top: 16rpx;
  font-size: 28rpx;
  line-height: 1.7;
  white-space: pre-wrap;
  &.clamp {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}
.reply {
  margin-top: 16rpx;
  padding: 16rpx 20rpx;
  border-radius: 12rpx;
  background: $bg;
  font-size: 24rpx;
  line-height: 1.6;
  color: $text-secondary;
}
.reply-label {
  color: $brand;
  font-weight: 500;
}
</style>
