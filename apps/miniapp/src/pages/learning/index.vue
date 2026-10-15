<template>
  <CertGate>
    <view class="card">
      <view v-for="c in courses" :key="c.id" class="item" @click="open(c)">
        <image v-if="c.cover" :src="c.cover" class="cover" mode="aspectFill" />
        <view v-else class="cover" />
        <view class="info">
          <view class="title">{{ c.title }}</view>
          <view class="muted">已学 {{ c.completedCount }}/{{ c.lessonCount }} 节</view>
          <progress :percent="c.progress" stroke-width="4" activeColor="#1F6F3F" class="bar" />
        </view>
      </view>
      <view v-if="loaded && !courses.length" class="muted empty">还没有课程，去课程页看看吧</view>
    </view>
  </CertGate>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { ref } from 'vue';
import { api, type MyCourse } from '@/api';
import CertGate from '@/components/CertGate.vue';
import { useUserStore } from '@/stores/user';

const user = useUserStore();
const courses = ref<MyCourse[]>([]);
const loaded = ref(false);

function open(c: MyCourse) {
  uni.navigateTo({
    url: c.lastLessonId ? `/pages/course/play?lessonId=${c.lastLessonId}&productId=${c.id}` : `/pages/course/detail?id=${c.id}`,
  });
}

onShow(async () => {
  await user.ensureLogin();
  if (!user.certified) return;
  courses.value = await api.myCourses();
  loaded.value = true;
});
</script>

<style lang="scss" scoped>
.item {
  display: flex;
  gap: 24rpx;
  padding: 20rpx 0;
}
.cover {
  width: 200rpx;
  height: 130rpx;
  border-radius: 12rpx;
  background: $brand-light;
  flex-shrink: 0;
}
.info {
  flex: 1;
}
.title {
  font-weight: 600;
  margin-bottom: 8rpx;
}
.bar {
  margin-top: 16rpx;
}
.empty {
  text-align: center;
  padding: 60rpx 0;
}
</style>
