<template>
  <CertGate>
    <!-- 品牌区：刀锋字标 + slogan，右侧进入「关于我们」 -->
    <view class="hero">
      <view>
        <image class="wordmark" src="/static/brand/wordmark.png" mode="heightFix" aria-label="逻辑解剖" />
        <view class="slogan">以解剖立学 · 以临床立教</view>
      </view>
      <view class="about-link" @click="goAbout">品牌故事 ›</view>
    </view>

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

    <!-- 按部位找课 -->
    <view class="card parts">
      <view class="sec-head">
        <view><text class="sec-title">按部位找课</text><text class="sec-en">By Region</text></view>
      </view>
      <view class="part-grid">
        <view v-for="p in PARTS" :key="p" class="part" @click="openCourses({ bodyPart: p })">
          <view class="part-icon"><image :src="`/static/parts/${p.toLowerCase()}.png`" mode="aspectFit" class="part-img" /></view>
          <text class="part-name">{{ BodyPartLabel[p] }}</text>
        </view>
      </view>
    </view>

    <!-- 课程体系入口 -->
    <view class="cats">
      <view v-for="(c, i) in categories" :key="c.id" :class="['cat', `tone${i}`]" @click="openCourseCategory(c.id)">
        <text class="cat-name">{{ c.name }}</text>
        <text class="cat-sub">{{ CAT_SUB[i] }}</text>
      </view>
      <view class="cat tone3" @click="goCoupons">
        <text class="cat-name">领券中心</text>
        <text class="cat-sub">新人与课程优惠</text>
      </view>
    </view>

    <!-- 线下会议日程：和「学习 → 我的日程」打通 -->
    <view class="card schedule" @click="goSchedule">
      <view class="schedule-icon">
        <view class="cal-top" />
        <text class="cal-day">{{ today }}</text>
      </view>
      <view class="schedule-info">
        <view class="schedule-title">线下会议日程</view>
        <view class="muted">查看课程安排与日程</view>
      </view>
      <text class="arrow">→</text>
    </view>

    <!-- 合作入口：仅从业者身份显示 -->
    <view v-if="user.profile?.identityType === 'PRACTITIONER'" class="card join" @click="goJoin">
      <view>
        <view class="join-title">合作招募</view>
        <view class="join-sub">品牌协作 · 渠道与区域合伙 · 机构团课</view>
      </view>
      <text class="join-go">了解合作</text>
    </view>

    <view v-for="sec in sections" :key="sec.title" class="card">
      <view class="sec-head">
        <view><text class="sec-title">{{ sec.title }}</text><text class="sec-en">{{ SECTION_EN[sec.title] ?? 'Courses' }}</text></view>
      </view>
      <ProductCard v-for="p in sec.products" :key="p.id" :product="p" />
    </view>
    <view v-if="loaded && !sections.length" class="card muted empty">暂无课程</view>

    <!-- 品牌卡片 -->
    <view class="card brand-card" @click="goAbout">
      <view class="brand-quote">析毫剖芒，不可为内</view>
      <view class="brand-desc">析芒教育 · 逻辑解剖 —— 深化面颈部解剖学的理解与应用，提高治疗的安全性与有效性</view>
      <view class="brand-go">了解品牌与创始人 ›</view>
    </view>
  </CertGate>
</template>

<script setup lang="ts">
import { BodyPart, BodyPartLabel, isTabPage } from '@luoji/shared';
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app';
import { ref } from 'vue';
import { api, type Category, type ProductCard as Card } from '@/api';
import CertGate from '@/components/CertGate.vue';
import ProductCard from '@/components/ProductCard.vue';
import { useUserStore } from '@/stores/user';
import { openCourseCategory, openCourses } from '@/utils/nav';

const PARTS = Object.values(BodyPart);
const CAT_SUB = ['四大主题 · 线下研习', '五大系列 · 随时学习', '免费 · 碎片化知识'];
const SECTION_EN: Record<string, string> = {
  线下精品课: 'Offline',
  专题课程: 'Featured',
  产品系列课: 'Series',
  直播回放: 'Replay',
  公益讲堂: 'Open Class',
};

const user = useUserStore();
const banners = ref<{ id: string; title: string; image: string; link: string | null }[]>([]);
const bannerIndex = ref(0);
const sections = ref<{ title: string; products: Card[] }[]>([]);
const categories = ref<Category[]>([]);
const loaded = ref(false);
const today = new Date().getDate();

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

const onBanner = (e: { detail: { current: number } }) => (bannerIndex.value = e.detail.current);
/** 运营位链接：tabBar 页面只能 switchTab */
const openLink = (link: string) => (isTabPage(link) ? uni.switchTab({ url: link }) : uni.navigateTo({ url: link }));
const goCoupons = () => uni.navigateTo({ url: '/pages/coupon/center' });
const goJoin = () => uni.navigateTo({ url: '/pages/join/index' });
const goAbout = () => uni.navigateTo({ url: '/pages/about/index' });
const goSchedule = () => uni.navigateTo({ url: '/pages/schedule/index' });

onShow(() => load().catch(() => undefined));
onPullDownRefresh(() => load().finally(() => uni.stopPullDownRefresh()));
</script>

<style lang="scss" scoped>
.hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 12rpx 36rpx 8rpx;
}
.wordmark {
  height: 72rpx;
  display: block;
}
.slogan {
  margin-top: 10rpx;
  font-size: 24rpx;
  letter-spacing: 6rpx;
  color: #4a5d86;
}
.about-link {
  margin-bottom: 6rpx;
  padding: 8rpx 22rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.7);
  border: 1rpx solid #d6e3fb;
  font-size: 22rpx;
  color: $brand;
}
.banner-wrap {
  position: relative;
  margin: 24rpx 28rpx 8rpx;
}
.banner {
  height: 296rpx;
  border-radius: $radius;
  overflow: hidden;
  box-shadow: 0 16rpx 40rpx rgba(20, 48, 111, 0.12);
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
  bottom: 18rpx;
  display: flex;
  justify-content: center;
  gap: 10rpx;
}
.dot {
  width: 12rpx;
  height: 6rpx;
  border-radius: 6rpx;
  background: rgba(255, 255, 255, 0.6);
  transition: width 0.3s;
  &.on {
    width: 32rpx;
    background: #fff;
  }
}
.part-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  row-gap: 24rpx;
  margin-top: 16rpx;
}
.part {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}
.part-icon {
  width: 100rpx;
  height: 100rpx;
  border-radius: 30rpx;
  background: linear-gradient(160deg, #f3f7ff, #e2ecff);
  display: flex;
  align-items: center;
  justify-content: center;
}
.part-img {
  width: 76rpx;
  height: 76rpx;
}
.part-name {
  font-size: 24rpx;
  color: $text;
}
.cats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
  margin: 24rpx 28rpx;
}
.cat {
  position: relative;
  overflow: hidden;
  padding: 28rpx 28rpx 26rpx;
  border-radius: $radius;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  box-shadow: $shadow;
  &::after {
    content: '';
    position: absolute;
    right: -40rpx;
    top: -40rpx;
    width: 150rpx;
    height: 150rpx;
    border-radius: 50%;
    border: 2rpx solid rgba(255, 255, 255, 0.7);
    box-shadow: 0 0 0 22rpx rgba(255, 255, 255, 0.25);
  }
  &.tone0 {
    background: linear-gradient(135deg, #3e74ee, #1f4fc4);
    .cat-name,
    .cat-sub {
      color: #fff;
    }
    .cat-sub {
      opacity: 0.8;
    }
  }
  &.tone1 {
    background: linear-gradient(135deg, #e6efff, #cfe0ff);
  }
  &.tone2 {
    background: linear-gradient(135deg, #e9f7f7, #cdeced);
  }
  &.tone3 {
    background: linear-gradient(135deg, #fbf3ea, #f1e0c9);
  }
}
.cat-name {
  font-size: 30rpx;
  font-weight: 600;
  color: $brand-deep;
}
.cat-sub {
  font-size: 22rpx;
  color: $text-secondary;
}
.schedule {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 26rpx 32rpx;
  background: linear-gradient(100deg, #ffffff 40%, #eef4ff);
}
.schedule-icon {
  width: 72rpx;
  height: 76rpx;
  border-radius: 16rpx;
  background: #fff;
  border: 2rpx solid #cfdcf7;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.cal-top {
  width: 100%;
  height: 18rpx;
  background: $brand-grad;
}
.cal-day {
  font-size: 32rpx;
  font-weight: 600;
  color: $brand-deep;
  line-height: 54rpx;
}
.schedule-info {
  flex: 1;
}
.schedule-title {
  font-size: 30rpx;
  font-weight: 600;
  margin-bottom: 2rpx;
}
.arrow {
  font-size: 34rpx;
  color: $brand;
}
.join {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(120deg, #eef4ff, #dbe7ff);
}
.join-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $brand-deep;
  margin-bottom: 6rpx;
}
.join-sub {
  font-size: 24rpx;
  color: $text-secondary;
}
.join-go {
  flex-shrink: 0;
  padding: 12rpx 28rpx;
  border-radius: 999rpx;
  background: $brand-grad;
  color: #fff;
  font-size: 24rpx;
}
.empty {
  padding: 40rpx 0;
  text-align: center;
}
.brand-card {
  margin-bottom: 40rpx;
  padding: 40rpx 36rpx;
  background: linear-gradient(135deg, #1d3c8f, #0e2156);
  color: #fff;
}
.brand-quote {
  font-family: 'Songti SC', 'STSong', 'Noto Serif SC', serif;
  font-size: 38rpx;
  font-weight: 600;
  letter-spacing: 6rpx;
}
.brand-desc {
  margin-top: 16rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.75);
}
.brand-go {
  margin-top: 24rpx;
  font-size: 24rpx;
  color: #9cc0ff;
}
</style>
