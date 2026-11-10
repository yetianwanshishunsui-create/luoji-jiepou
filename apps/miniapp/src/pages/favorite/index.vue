<template>
  <CertGate>
    <view class="card">
      <ProductCard v-for="p in list" :key="p.id" :product="p" />
      <view v-if="loaded && !list.length" class="empty">
        <text class="empty-icon">☆</text>
        <view class="muted">还没有收藏的课程</view>
        <view class="muted">在课程详情页点底部「收藏」即可加入</view>
        <view class="go" @click="goCourses">去看看课程 →</view>
      </view>
    </view>
  </CertGate>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { ref } from 'vue';
import { api, type ProductCard as Card } from '@/api';
import CertGate from '@/components/CertGate.vue';
import ProductCard from '@/components/ProductCard.vue';
import { useUserStore } from '@/stores/user';

const user = useUserStore();
const list = ref<Card[]>([]);
const loaded = ref(false);

const goCourses = () => uni.switchTab({ url: '/pages/course/list' });

// 从详情页取消收藏后返回，列表随之刷新
onShow(async () => {
  await user.ensureLogin();
  if (!user.certified) return;
  list.value = await api.favorites();
  loaded.value = true;
});
</script>

<style lang="scss" scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 60rpx 0 40rpx;
}
.empty-icon {
  font-size: 72rpx;
  color: #c5d6f5;
}
.go {
  margin-top: 20rpx;
  font-size: 26rpx;
  color: $brand;
}
</style>
