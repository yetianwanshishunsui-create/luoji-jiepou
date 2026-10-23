<template>
  <!-- 课程详情页评价区：评价数、平均分、前 3 条（精选在前） -->
  <view v-if="data" class="card">
    <view class="title-row" @click="openAll(false)">
      <view class="title">
        <text>学员评价（{{ data.count }}）</text>
        <text v-if="data.avgRating != null" class="score">★ {{ data.avgRating.toFixed(1) }}</text>
      </view>
      <text class="muted">查看全部 ›</text>
    </view>
    <ReviewItem v-for="r in data.list" :key="r.id" :review="r" clamp />
    <view v-if="!data.count" class="muted empty">还没有评价{{ data.canReview && !data.mine ? '，来写下第一条吧' : '' }}</view>
    <view v-if="data.mine && data.mine.status !== 'VISIBLE'" class="mine-tip">
      {{ data.mine.status === 'PENDING' ? '你的评价已提交，审核通过后展示' : '你的评价未通过审核，可修改后重新提交' }}
    </view>
    <button v-if="data.canReview" class="write" size="mini" @click="openAll(true)">{{ data.mine ? '修改我的评价' : '写评价' }}</button>
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { api, type ReviewPage } from '@/api';
import ReviewItem from './ReviewItem.vue';

const props = defineProps<{ productId: string; refreshKey?: number }>();
const data = ref<ReviewPage>();

async function load() {
  data.value = await api.reviews(props.productId, { page: 1, pageSize: 3 }).catch(() => undefined);
}

const openAll = (write: boolean) => uni.navigateTo({ url: `/pages/course/reviews?id=${props.productId}${write ? '&write=1' : ''}` });

watch(() => [props.productId, props.refreshKey], load, { immediate: true });
</script>

<style lang="scss" scoped>
.title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4rpx;
}
.title {
  font-size: 30rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.score {
  font-size: 26rpx;
  color: #f5a623;
  font-weight: 600;
}
.empty {
  padding: 24rpx 0 8rpx;
}
.mine-tip {
  margin-top: 16rpx;
  padding: 14rpx 20rpx;
  border-radius: 12rpx;
  background: #fff8ee;
  color: #b45309;
  font-size: 24rpx;
}
.write {
  margin-top: 20rpx;
  background: $brand-light;
  color: $brand;
  border-radius: 999rpx;
  &::after {
    border: none;
  }
}
</style>
