<template>
  <CertGate>
    <!-- 我的日程：线下会议日程里加入计划 / 已报名的场次 -->
    <view class="card">
      <view class="sec-head">
        <view><text class="sec-title">我的日程</text></view>
        <text class="sec-more" @click="goSchedule('mine')">全部 ›</text>
      </view>
      <view v-for="p in plans.slice(0, 3)" :key="p.id" class="plan" @click="goSchedule('mine')">
        <view class="plan-date">
          <text class="plan-day">{{ new Date(p.startAt).getDate() }}</text>
          <text class="plan-month">{{ new Date(p.startAt).getMonth() + 1 }} 月</text>
        </view>
        <view class="plan-info">
          <view class="plan-title">{{ p.product.title }}</view>
          <view class="muted">{{ p.title }} · {{ p.address }}</view>
        </view>
        <text :class="['plan-tag', { enrolled: p.myEnrollment }]">{{ p.myEnrollment ? '已报名' : '计划中' }}</text>
      </view>
      <view v-if="loaded && !plans.length" class="plan-empty" @click="goSchedule('all')">
        <text class="muted">还没有线下日程安排</text>
        <text class="link">查看线下会议日程 →</text>
      </view>
    </view>

    <view class="card">
      <view class="sec-head">
        <view><text class="sec-title">我的课程</text></view>
      </view>
      <view v-for="c in courses" :key="c.id" class="item" @click="open(c)">
        <image v-if="c.cover" :src="c.cover" class="cover" mode="aspectFill" />
        <view v-else class="cover" />
        <view class="info">
          <view class="title">{{ c.title }}</view>
          <view class="muted">已学 {{ c.completedCount }}/{{ c.lessonCount }} 节 · {{ c.progress }}%</view>
          <view class="track"><view class="track-bar" :style="{ width: `${c.progress}%` }" /></view>
        </view>
      </view>
      <view v-if="loaded && !courses.length" class="muted empty">还没有课程，去课程页看看吧</view>
    </view>
  </CertGate>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { ref } from 'vue';
import { api, type MyCourse, type ScheduleItem } from '@/api';
import CertGate from '@/components/CertGate.vue';
import { useUserStore } from '@/stores/user';

const user = useUserStore();
const courses = ref<MyCourse[]>([]);
const plans = ref<ScheduleItem[]>([]);
const loaded = ref(false);

function open(c: MyCourse) {
  uni.navigateTo({
    url: c.lastLessonId ? `/pages/course/play?lessonId=${c.lastLessonId}&productId=${c.id}` : `/pages/course/detail?id=${c.id}`,
  });
}

const goSchedule = (tab: 'all' | 'mine') => uni.navigateTo({ url: `/pages/schedule/index?tab=${tab}` });

onShow(async () => {
  await user.ensureLogin();
  if (!user.certified) return;
  [courses.value, plans.value] = await Promise.all([api.myCourses(), api.plans()]);
  loaded.value = true;
});
</script>

<style lang="scss" scoped>
.plan {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 22rpx 0;
  border-bottom: 1rpx solid $line;
  &:last-of-type {
    border-bottom: none;
  }
}
.plan-date {
  width: 96rpx;
  height: 96rpx;
  border-radius: 20rpx;
  background: linear-gradient(160deg, #f3f7ff, #dde8ff);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.plan-day {
  font-size: 32rpx;
  font-weight: 700;
  color: $brand;
  line-height: 1.1;
}
.plan-month {
  font-size: 20rpx;
  color: $text-secondary;
}
.plan-info {
  flex: 1;
  min-width: 0;
}
.plan-title {
  font-weight: 600;
  margin-bottom: 4rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.plan-tag {
  flex-shrink: 0;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
  font-size: 20rpx;
  background: #fff3e6;
  color: #c2630c;
  &.enrolled {
    background: #e8f7ee;
    color: #138a4a;
  }
}
.plan-empty {
  display: flex;
  justify-content: space-between;
  padding: 24rpx 0 8rpx;
}
.link {
  font-size: 24rpx;
  color: $brand;
}
.item {
  display: flex;
  gap: 24rpx;
  padding: 22rpx 0;
  border-bottom: 1rpx solid $line;
  &:last-of-type {
    border-bottom: none;
  }
}
.cover {
  width: 210rpx;
  height: 140rpx;
  border-radius: 16rpx;
  background: $brand-light;
  flex-shrink: 0;
}
.info {
  flex: 1;
  min-width: 0;
}
.title {
  font-weight: 600;
  margin-bottom: 8rpx;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.track {
  margin-top: 16rpx;
  height: 10rpx;
  border-radius: 10rpx;
  background: $brand-light;
  overflow: hidden;
}
.track-bar {
  height: 100%;
  border-radius: 10rpx;
  background: $brand-grad;
}
.empty {
  text-align: center;
  padding: 60rpx 0;
}
</style>
