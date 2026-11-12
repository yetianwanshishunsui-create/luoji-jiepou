<template>
  <NavBar logo :opacity="navOpacity" />
  <CertGate under-nav>
    <!-- 通铺大图：从状态栏开始铺满，导航栏透明叠在上面 -->
    <view class="hero">
      <swiper v-if="banners.length" class="hero-swiper" circular autoplay :interval="4500" @change="onBanner">
        <swiper-item v-for="b in banners" :key="b.id" @click="b.link && openLink(b.link)">
          <image :src="b.image" :aria-label="b.title" mode="aspectFill" class="hero-img" />
        </swiper-item>
      </swiper>
      <view v-else class="hero-swiper hero-empty" />
      <view class="dots">
        <view v-for="(b, i) in banners" :key="b.id" :class="['dot', { on: i === bannerIndex }]" />
      </view>
    </view>

    <!-- 入口卡片：压住大图底边，3 × 2 线条图标 -->
    <view class="entry-card">
      <view v-for="e in entries" :key="e.name" class="entry" @click="e.go()">
        <image :src="`/static/icons/${e.icon}.png`" class="entry-icon" mode="aspectFit" />
        <text class="entry-name">{{ e.name }}</text>
      </view>
    </view>

    <!-- 合作入口：仅从业者身份显示 -->
    <view v-if="user.profile?.identityType === 'PRACTITIONER'" class="join" @click="goJoin">
      <view>
        <view class="join-title">合作招募</view>
        <view class="join-sub">品牌协作 · 渠道与区域合伙 · 机构团课</view>
      </view>
      <text class="join-go">了解合作 ›</text>
    </view>

    <!-- 推荐栏目：两列网格 -->
    <view v-for="sec in sections" :key="sec.title" class="section">
      <view class="sec-head">
        <text class="sec-title">{{ sec.title }}</text>
        <text class="sec-more" @click="openMore(sec.title)">查看全部 ›</text>
      </view>
      <view class="card-grid">
        <ProductCard v-for="p in sec.products.slice(0, 4)" :key="p.id" :product="p" layout="grid" />
      </view>
    </view>
    <view v-if="loaded && !sections.length" class="card muted empty">暂无课程</view>

    <!-- 品牌 -->
    <view class="brand-card" @click="goAbout">
      <image class="brand-mark" src="/static/brand/wordmark-white.png" mode="heightFix" />
      <view class="brand-slogan">以解剖立学 · 以临床立教</view>
      <view class="brand-desc">析毫剖芒，不可为内 —— 深化面颈部解剖学的理解与应用，提高治疗的安全性与有效性</view>
      <view class="brand-go">品牌故事与创始人 ›</view>
    </view>
  </CertGate>
</template>

<script setup lang="ts">
import { isTabPage } from '@luoji/shared';
import { onPageScroll, onPullDownRefresh, onShow } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';
import { api, type Category, type ProductCard as Card } from '@/api';
import CertGate from '@/components/CertGate.vue';
import NavBar from '@/components/NavBar.vue';
import ProductCard from '@/components/ProductCard.vue';
import { useUserStore } from '@/stores/user';
import { openCourseCategory } from '@/utils/nav';

const user = useUserStore();
const banners = ref<{ id: string; title: string; image: string; link: string | null }[]>([]);
const bannerIndex = ref(0);
const sections = ref<{ title: string; products: Card[] }[]>([]);
const categories = ref<Category[]>([]);
const loaded = ref(false);

// 导航栏随滚动从透明过渡到白底
const scrollTop = ref(0);
onPageScroll((e) => (scrollTop.value = e.scrollTop));
const navOpacity = computed(() => Math.min(1, scrollTop.value / 160));

/** 按一级分类名称找分类，后台改了排序也能对上 */
const openRoot = (word: string) => {
  const c = categories.value.find((x) => x.name.includes(word));
  return c ? openCourseCategory(c.id) : uni.switchTab({ url: '/pages/course/list' });
};

const entries = [
  { name: '线下精品课', icon: 'offline', go: () => openRoot('线下') },
  { name: '线上精品课', icon: 'online', go: () => openRoot('线上') },
  { name: '公益讲堂', icon: 'free', go: () => openRoot('公益') },
  { name: '会议日程', icon: 'schedule', go: () => uni.navigateTo({ url: '/pages/schedule/index' }) },
  { name: '领券中心', icon: 'coupon', go: () => uni.navigateTo({ url: '/pages/coupon/center' }) },
  { name: '品牌故事', icon: 'brand', go: () => goAbout() },
];

/** 栏目「查看全部」：线下 / 公益栏目进对应分类，其余进线上精品课 */
const openMore = (title: string) => openRoot(title.includes('线下') ? '线下' : title.includes('公益') ? '公益' : '线上');

async function load() {
  await user.ensureLogin();
  if (!user.certified) {
    await user.refreshProfile(); // 审核通过后返回首页即可刷新状态
    if (!user.certified) return;
  }
  const [res, cats] = await Promise.all([api.home(), api.categories()]);
  banners.value = res.banners;
  sections.value = res.sections;
  categories.value = cats;
  loaded.value = true;
}

const onBanner = (e: { detail: { current: number } }) => (bannerIndex.value = e.detail.current);
/** 运营位链接：tabBar 页面只能 switchTab */
const openLink = (link: string) => (isTabPage(link) ? uni.switchTab({ url: link }) : uni.navigateTo({ url: link }));
const goJoin = () => uni.navigateTo({ url: '/pages/join/index' });
const goAbout = () => uni.navigateTo({ url: '/pages/about/index' });

onShow(() => load().catch(() => undefined));
onPullDownRefresh(() => load().finally(() => uni.stopPullDownRefresh()));
</script>

<style lang="scss" scoped>
.hero {
  position: relative;
}
.hero-swiper {
  height: 640rpx;
}
.hero-empty {
  background: linear-gradient(160deg, #eaf2ff, #cfe0ff);
}
.hero-img {
  width: 100%;
  height: 100%;
}
.dots {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 118rpx;
  display: flex;
  justify-content: center;
  gap: 10rpx;
}
.dot {
  width: 14rpx;
  height: 6rpx;
  border-radius: 6rpx;
  background: rgba(42, 91, 215, 0.25);
  transition: width 0.3s;
  &.on {
    width: 36rpx;
    background: $brand;
  }
}
.entry-card {
  position: relative;
  z-index: 2;
  margin: -92rpx 28rpx 0;
  padding: 36rpx 0 12rpx;
  border-radius: 28rpx;
  background: #fff;
  box-shadow: 0 16rpx 44rpx rgba(20, 48, 111, 0.1);
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}
.entry {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14rpx;
  padding-bottom: 32rpx;
}
.entry-icon {
  width: 76rpx;
  height: 76rpx;
}
.entry-name {
  font-size: 26rpx;
  color: $text;
}
.join {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 28rpx 28rpx 0;
  padding: 30rpx 32rpx;
  border-radius: 24rpx;
  background: linear-gradient(120deg, #eef4ff, #d9e6ff);
}
.join-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $brand-deep;
  margin-bottom: 4rpx;
}
.join-sub {
  font-size: 24rpx;
  color: $text-secondary;
}
.join-go {
  font-size: 24rpx;
  color: $brand;
  font-weight: 500;
}
.section {
  margin-top: 44rpx;
  padding: 0 28rpx;
}
.card-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 22rpx;
  margin-top: 8rpx;
}
.empty {
  padding: 40rpx 0;
  text-align: center;
}
.brand-card {
  position: relative;
  overflow: hidden;
  margin: 48rpx 28rpx 40rpx;
  padding: 44rpx 40rpx;
  border-radius: 28rpx;
  background: linear-gradient(140deg, #4a80f5 0%, #2a5bd7 45%, #173a94 100%);
  color: #fff;
  &::after {
    content: '';
    position: absolute;
    right: -120rpx;
    top: -120rpx;
    width: 380rpx;
    height: 380rpx;
    border-radius: 50%;
    border: 2rpx solid rgba(255, 255, 255, 0.25);
    box-shadow:
      0 0 0 46rpx rgba(255, 255, 255, 0.05),
      0 0 0 48rpx rgba(255, 255, 255, 0.16);
  }
}
.brand-mark {
  height: 56rpx;
}
.brand-slogan {
  margin-top: 14rpx;
  font-size: 26rpx;
  letter-spacing: 8rpx;
}
.brand-desc {
  margin-top: 18rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.75);
}
.brand-go {
  margin-top: 22rpx;
  font-size: 24rpx;
  color: #cfe0ff;
}
</style>
