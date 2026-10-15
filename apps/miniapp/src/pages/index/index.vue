<template>
  <CertGate>
    <swiper v-if="banners.length" class="banner" circular autoplay indicator-dots>
      <swiper-item v-for="b in banners" :key="b.id" @click="b.link && openLink(b.link)">
        <image :src="b.image" :aria-label="b.title" mode="aspectFill" class="banner-img" />
      </swiper-item>
    </swiper>

    <view class="card entry" @click="goCoupons">
      <view>
        <view class="section-title">领券中心</view>
        <view class="muted">领取优惠券，购课更划算</view>
      </view>
      <text class="arrow">›</text>
    </view>

    <view v-for="sec in sections" :key="sec.title" class="card">
      <view class="section-title">{{ sec.title }}</view>
      <ProductCard v-for="p in sec.products" :key="p.id" :product="p" />
    </view>
    <view v-if="loaded && !sections.length" class="card muted empty">暂无课程</view>

    <view class="card join" @click="goJoin">
      <view>
        <view class="section-title">从业者合作</view>
        <view class="muted">了解合作政策，留下联系方式</view>
      </view>
      <text class="arrow">›</text>
    </view>
  </CertGate>
</template>

<script setup lang="ts">
import { isTabPage } from '@luoji/shared';
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app';
import { ref } from 'vue';
import { api, type ProductCard as Card } from '@/api';
import CertGate from '@/components/CertGate.vue';
import ProductCard from '@/components/ProductCard.vue';
import { useUserStore } from '@/stores/user';

const user = useUserStore();
const banners = ref<{ id: string; title: string; image: string; link: string | null }[]>([]);
const sections = ref<{ title: string; products: Card[] }[]>([]);
const loaded = ref(false);

async function load() {
  await user.ensureLogin();
  if (!user.certified) {
    await user.refreshProfile(); // 审核通过后返回首页即可刷新状态
    if (!user.certified) return;
  }
  const res = await api.home();
  banners.value = res.banners;
  sections.value = res.sections;
  loaded.value = true;
}

/** 运营位链接：tabBar 页面只能 switchTab */
const openLink = (link: string) => (isTabPage(link) ? uni.switchTab({ url: link }) : uni.navigateTo({ url: link }));
const goJoin = () => uni.navigateTo({ url: '/pages/join/index' });
const goCoupons = () => uni.navigateTo({ url: '/pages/coupon/center' });

onShow(() => load().catch(() => undefined));
onPullDownRefresh(() => load().finally(() => uni.stopPullDownRefresh()));
</script>

<style lang="scss" scoped>
.banner {
  height: 300rpx;
  margin: 24rpx;
  border-radius: $radius;
  overflow: hidden;
}
.banner-img {
  width: 100%;
  height: 100%;
}
.section-title {
  font-size: 32rpx;
  font-weight: 600;
  margin-bottom: 8rpx;
}
.empty {
  padding: 40rpx 0;
  text-align: center;
}
.join,
.entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.arrow {
  font-size: 48rpx;
  color: $text-secondary;
}
</style>
