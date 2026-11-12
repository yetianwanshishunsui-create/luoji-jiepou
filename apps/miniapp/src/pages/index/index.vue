<template>
  <CertGate>
    <!-- 顶部：品牌故事与创始人 -->
    <view class="brand" @click="goAbout">
      <view class="brand-rings" />
      <view class="brand-text">
        <image class="brand-mark" src="/static/brand/wordmark.png" mode="heightFix" aria-label="逻辑解剖" />
        <view class="brand-slogan">以解剖立学 · 以临床立教</view>
        <view class="founder-line">
          <text class="founder-name">{{ founder.name }}</text>
          <text class="founder-title">{{ founder.title }}</text>
        </view>
        <view class="brand-go">品牌故事与创始人 ›</view>
      </view>
      <image v-if="founder.photo" class="founder-photo" :src="founder.photo" mode="aspectFill" />
      <view v-else class="founder-photo monogram">{{ founder.name.slice(0, 1) }}</view>
    </view>

    <!-- 轮播图 -->
    <view v-if="banners.length" class="banner-wrap">
      <swiper class="banner" circular autoplay :interval="4500" @change="onBanner">
        <swiper-item v-for="b in banners" :key="b.id" @click="b.link && openLink(b.link)">
          <image :src="b.image" :aria-label="b.title" mode="aspectFill" class="banner-img" />
        </swiper-item>
      </swiper>
      <view class="dots">
        <view v-for="(b, i) in banners" :key="b.id" :class="['dot', { on: i === bannerIndex }]" />
      </view>
    </view>

    <!-- 入口：3 × 2 线条图标 -->
    <view class="card entries">
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
    <view class="bottom-space" />
  </CertGate>
</template>

<script setup lang="ts">
import { DEFAULT_ABOUT_PAGE, isTabPage, type AboutPageConfig } from '@luoji/shared';
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app';
import { ref } from 'vue';
import { api, type Category, type ProductCard as Card } from '@/api';
import CertGate from '@/components/CertGate.vue';
import ProductCard from '@/components/ProductCard.vue';
import { useUserStore } from '@/stores/user';
import { openCourseCategory } from '@/utils/nav';

const user = useUserStore();
const banners = ref<{ id: string; title: string; image: string; link: string | null }[]>([]);
const bannerIndex = ref(0);
const sections = ref<{ title: string; products: Card[] }[]>([]);
const categories = ref<Category[]>([]);
const founder = ref<AboutPageConfig['founder']>(DEFAULT_ABOUT_PAGE.founder);
const loaded = ref(false);

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
  { name: '领券中心', icon: 'gift', go: () => uni.navigateTo({ url: '/pages/coupon/center' }) },
  { name: '我的收藏', icon: 'favorite', go: () => uni.navigateTo({ url: '/pages/favorite/index' }) },
];

/** 栏目「查看全部」：线下 / 公益栏目进对应分类，其余进线上精品课 */
const openMore = (title: string) => openRoot(title.includes('线下') ? '线下' : title.includes('公益') ? '公益' : '线上');

async function load() {
  await user.ensureLogin();
  if (!user.certified) {
    await user.refreshProfile(); // 审核通过后返回首页即可刷新状态
    if (!user.certified) return;
  }
  const [res, cats, about] = await Promise.all([api.home(), api.categories(), api.aboutPage().catch(() => null)]);
  banners.value = res.banners;
  sections.value = res.sections;
  categories.value = cats;
  if (about) founder.value = about.founder;
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
.brand {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin: 20rpx 28rpx 0;
  padding: 32rpx 28rpx 32rpx 36rpx;
  border-radius: 28rpx;
  background: linear-gradient(135deg, #ffffff 0%, #eef4ff 55%, #dbe7ff 100%);
  box-shadow: 0 12rpx 36rpx rgba(20, 48, 111, 0.08);
}
.brand-rings {
  position: absolute;
  right: -90rpx;
  bottom: -150rpx;
  width: 360rpx;
  height: 360rpx;
  border-radius: 50%;
  border: 2rpx solid rgba(42, 91, 215, 0.12);
  box-shadow:
    0 0 0 40rpx rgba(255, 255, 255, 0.4),
    0 0 0 42rpx rgba(42, 91, 215, 0.08);
}
.brand-text {
  position: relative;
  flex: 1;
  min-width: 0;
}
.brand-mark {
  height: 52rpx;
  display: block;
}
.brand-slogan {
  margin-top: 10rpx;
  font-size: 22rpx;
  letter-spacing: 4rpx;
  color: #4a5d86;
}
.founder-line {
  margin-top: 26rpx;
  display: flex;
  align-items: baseline;
  gap: 12rpx;
}
.founder-name {
  font-size: 28rpx;
  font-weight: 600;
  color: $brand-deep;
}
.founder-title {
  font-size: 22rpx;
  color: $text-secondary;
}
.brand-go {
  display: inline-block;
  margin-top: 18rpx;
  padding: 6rpx 20rpx;
  border-radius: 999rpx;
  background: $brand-grad;
  color: #fff;
  font-size: 22rpx;
}
.founder-photo {
  position: relative;
  width: 168rpx;
  height: 224rpx;
  border-radius: 20rpx;
  flex-shrink: 0;
  background: #fff;
  border: 4rpx solid #fff;
  box-shadow: 0 10rpx 24rpx rgba(20, 48, 111, 0.14);
}
.monogram {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(160deg, #e6efff, #c9dbff);
  font-size: 72rpx;
  font-weight: 600;
  color: $brand;
}
.banner-wrap {
  position: relative;
  margin: 24rpx 28rpx 0;
}
.banner {
  height: 296rpx;
  border-radius: 24rpx;
  overflow: hidden;
  transform: translateY(0); /* 修复 iOS 圆角裁剪失效 */
}
.banner-img {
  width: 100%;
  height: 100%;
}
.dots {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 16rpx;
  display: flex;
  justify-content: center;
  gap: 8rpx;
}
.dot {
  width: 12rpx;
  height: 6rpx;
  border-radius: 6rpx;
  background: rgba(42, 91, 215, 0.25);
  transition: width 0.3s;
  &.on {
    width: 30rpx;
    background: $brand;
  }
}
.entries {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: 30rpx 0 4rpx;
}
.entry {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  padding-bottom: 26rpx;
}
.entry-icon {
  width: 60rpx;
  height: 60rpx;
}
.entry-name {
  font-size: 24rpx;
  color: $text;
}
.join {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 28rpx;
  padding: 26rpx 30rpx;
  border-radius: 24rpx;
  background: linear-gradient(120deg, #eef4ff, #d9e6ff);
}
.join-title {
  font-size: 26rpx;
  font-weight: 600;
  color: $brand-deep;
  margin-bottom: 4rpx;
}
.join-sub {
  font-size: 22rpx;
  color: $text-secondary;
}
.join-go {
  font-size: 22rpx;
  color: $brand;
  font-weight: 500;
}
.section {
  margin-top: 36rpx;
  padding: 0 28rpx;
}
.card-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
  margin-top: 6rpx;
}
.empty {
  padding: 40rpx 0;
  text-align: center;
}
.bottom-space {
  height: 40rpx;
}
</style>
