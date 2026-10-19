<template>
  <CertGate>
    <view class="brand">
      <view class="brand-name">逻辑解剖</view>
      <view class="brand-slogan">以解剖立学，以注射立教</view>
    </view>

    <swiper v-if="banners.length" class="banner" circular autoplay indicator-dots indicator-active-color="#ffffff">
      <swiper-item v-for="b in banners" :key="b.id" @click="b.link && openLink(b.link)">
        <image :src="b.image" :aria-label="b.title" mode="aspectFill" class="banner-img" />
      </swiper-item>
    </swiper>

    <!-- 课程分类入口：取后台一级分类，加领券中心 -->
    <view class="card entries">
      <view v-for="(c, i) in categories" :key="c.id" class="entry" @click="openCourseCategory(c.id)">
        <view :class="['entry-icon', `tone${i % 4}`]">{{ c.name.slice(0, 2) }}</view>
        <text class="entry-name">{{ c.name }}</text>
      </view>
      <view class="entry" @click="goCoupons">
        <view class="entry-icon tone3">领券</view>
        <text class="entry-name">领券中心</text>
      </view>
    </view>

    <!-- 合作入口：仅从业者身份显示 -->
    <view v-if="user.profile?.identityType === 'PRACTITIONER'" class="card join" @click="goJoin">
      <view>
        <view class="join-title">合作招募</view>
        <view class="join-sub">品牌协作 · 渠道与区域合伙 · 机构团课</view>
      </view>
      <text class="join-go">了解合作 ›</text>
    </view>

    <view v-for="sec in sections" :key="sec.title" class="card">
      <view class="section-title">{{ sec.title }}</view>
      <ProductCard v-for="p in sec.products" :key="p.id" :product="p" />
    </view>
    <view v-if="loaded && !sections.length" class="card muted empty">暂无课程</view>
  </CertGate>
</template>

<script setup lang="ts">
import { isTabPage } from '@luoji/shared';
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app';
import { ref } from 'vue';
import { api, type Category, type ProductCard as Card } from '@/api';
import CertGate from '@/components/CertGate.vue';
import ProductCard from '@/components/ProductCard.vue';
import { useUserStore } from '@/stores/user';
import { openCourseCategory } from '@/utils/nav';

const user = useUserStore();
const banners = ref<{ id: string; title: string; image: string; link: string | null }[]>([]);
const sections = ref<{ title: string; products: Card[] }[]>([]);
const categories = ref<Category[]>([]);
const loaded = ref(false);

async function load() {
  await user.ensureLogin();
  if (!user.certified) {
    await user.refreshProfile(); // 审核通过后返回首页即可刷新状态
    if (!user.certified) return;
  }
  const [res, cats] = await Promise.all([api.home(), api.categories()]);
  banners.value = res.banners;
  sections.value = res.sections;
  categories.value = cats.slice(0, 3);
  loaded.value = true;
}

/** 运营位链接：tabBar 页面只能 switchTab */
const openLink = (link: string) => (isTabPage(link) ? uni.switchTab({ url: link }) : uni.navigateTo({ url: link }));
const goCoupons = () => uni.navigateTo({ url: '/pages/coupon/center' });
const goJoin = () => uni.navigateTo({ url: '/pages/join/index' });

onShow(() => load().catch(() => undefined));
onPullDownRefresh(() => load().finally(() => uni.stopPullDownRefresh()));
</script>

<style lang="scss" scoped>
.brand {
  padding: 28rpx 32rpx 4rpx;
  display: flex;
  align-items: baseline;
  gap: 20rpx;
}
.brand-name {
  font-size: 40rpx;
  font-weight: 800;
  font-style: italic;
  color: $brand;
  letter-spacing: 2rpx;
}
.brand-slogan {
  font-size: 24rpx;
  color: $text-secondary;
}
.banner {
  height: 300rpx;
  margin: 20rpx 24rpx;
  border-radius: $radius;
  overflow: hidden;
}
.banner-img {
  width: 100%;
  height: 100%;
}
.entries {
  display: flex;
  justify-content: space-around;
  padding: 28rpx 12rpx;
}
.entry {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  width: 25%;
}
.entry-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  font-weight: 700;
  color: #fff;
  &.tone0 {
    background: linear-gradient(135deg, $brand, $brand-deep);
  }
  &.tone1 {
    background: linear-gradient(135deg, #2f6be0, #1f4fbf);
  }
  &.tone2 {
    background: linear-gradient(135deg, #b45309, #8f3f08);
  }
  &.tone3 {
    background: linear-gradient(135deg, #d4380d, #a8290a);
  }
}
.entry-name {
  font-size: 24rpx;
  color: $text;
}
.join {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, $brand-light, #dbe6fb);
}
.join-title {
  font-size: 30rpx;
  font-weight: 700;
  color: $brand-deep;
  margin-bottom: 6rpx;
}
.join-sub {
  font-size: 24rpx;
  color: $text-secondary;
}
.join-go {
  flex-shrink: 0;
  padding: 10rpx 24rpx;
  border-radius: 999rpx;
  background: $brand;
  color: #fff;
  font-size: 24rpx;
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
</style>
