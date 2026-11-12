<template>
  <view v-if="about" class="page">
    <!-- 品牌 -->
    <view class="hero">
      <view class="hero-rings" />
      <text class="hero-en">LOGIC ANATOMY · XIMANG EDUCATION</text>
      <image class="hero-mark" src="/static/brand/wordmark-white.png" mode="heightFix" aria-label="逻辑解剖" />
      <text class="hero-slogan">{{ about.brand.slogan }}</text>
      <text class="hero-name">{{ about.brand.name }}</text>
    </view>

    <!-- 引文 -->
    <view v-if="about.quote.text" class="card quote">
      <text class="quote-mark">“</text>
      <view class="quote-text">{{ about.quote.text }}</view>
      <view class="quote-src">—— {{ about.quote.source }}</view>
    </view>

    <!-- 公司介绍 -->
    <view class="card">
      <view class="sec-head"><view><text class="sec-title">品牌介绍</text></view></view>
      <view class="company-title">{{ about.company.title }}</view>
      <view v-for="(p, i) in about.company.paragraphs" :key="i" class="para">{{ p }}</view>
    </view>

    <!-- 创始人 -->
    <view class="card founder">
      <view class="sec-head"><view><text class="sec-title">创始人</text></view></view>
      <view class="founder-main">
        <image v-if="about.founder.photo" :src="about.founder.photo" mode="aspectFill" class="photo" />
        <view v-else class="photo monogram">{{ about.founder.name.slice(0, 1) }}</view>
        <view class="founder-info">
          <view class="founder-name">{{ about.founder.name }}</view>
          <view class="founder-title">{{ about.founder.title }}</view>
          <view v-for="t in about.founder.tags" :key="t" class="founder-tag">{{ t }}</view>
        </view>
      </view>
      <view v-if="about.founder.bio" class="para bio">{{ about.founder.bio }}</view>
      <view class="stats">
        <view v-for="st in about.stats" :key="st.label" class="stat">
          <text class="stat-value">{{ st.value }}</text>
          <text class="stat-label">{{ st.label }}</text>
        </view>
      </view>
    </view>

    <view class="cta">
      <button class="btn-primary" @click="goCourses">浏览课程</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { AboutPageConfig } from '@luoji/shared';
import { onLoad } from '@dcloudio/uni-app';
import { ref } from 'vue';
import { api } from '@/api';

const about = ref<AboutPageConfig>();

onLoad(async () => {
  about.value = await api.aboutPage();
});

const goCourses = () => uni.switchTab({ url: '/pages/course/list' });
</script>

<style lang="scss" scoped>
.page {
  padding-bottom: 60rpx;
}
.hero {
  position: relative;
  overflow: hidden;
  margin: 20rpx 28rpx 0;
  padding: 64rpx 44rpx 56rpx;
  border-radius: 32rpx;
  background: linear-gradient(150deg, #2a5bd7 0%, #173a94 55%, #0d1f52 100%);
  display: flex;
  flex-direction: column;
  box-shadow: 0 20rpx 48rpx rgba(13, 31, 82, 0.22);
}
.hero-rings {
  position: absolute;
  right: -160rpx;
  top: -120rpx;
  width: 460rpx;
  height: 460rpx;
  border-radius: 50%;
  border: 2rpx solid rgba(255, 255, 255, 0.25);
  box-shadow:
    0 0 0 50rpx rgba(255, 255, 255, 0.04),
    0 0 0 52rpx rgba(255, 255, 255, 0.16),
    0 0 0 110rpx rgba(255, 255, 255, 0.03),
    0 0 0 112rpx rgba(255, 255, 255, 0.12);
}
.hero-en {
  font-size: 18rpx;
  letter-spacing: 4rpx;
  color: rgba(255, 255, 255, 0.6);
}
.hero-mark {
  height: 96rpx;
  margin: 28rpx 0 20rpx;
}
.hero-slogan {
  font-size: 30rpx;
  letter-spacing: 10rpx;
  color: #fff;
}
.hero-name {
  margin-top: 14rpx;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.7);
}
.quote {
  position: relative;
  padding: 44rpx 40rpx 36rpx;
  background: linear-gradient(160deg, #ffffff 55%, #f1f6ff);
}
.quote-mark {
  position: absolute;
  left: 22rpx;
  top: -6rpx;
  font-family: 'Songti SC', 'STSong', 'Noto Serif SC', serif;
  font-size: 110rpx;
  color: #d3e1fb;
  line-height: 1;
}
.quote-text {
  position: relative;
  font-family: 'Songti SC', 'STSong', 'Noto Serif SC', serif;
  font-size: 30rpx;
  line-height: 2;
  letter-spacing: 2rpx;
  color: $brand-deep;
}
.quote-src {
  margin-top: 16rpx;
  text-align: right;
  font-size: 24rpx;
  color: $text-secondary;
}
.company-title {
  margin: 8rpx 0 12rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: $brand-deep;
}
.para {
  margin-top: 16rpx;
  font-size: 28rpx;
  line-height: 1.9;
  color: #36405a;
  text-align: justify;
}
.founder-main {
  display: flex;
  gap: 32rpx;
  margin-top: 16rpx;
}
.photo {
  width: 220rpx;
  height: 293rpx;
  border-radius: 20rpx;
  flex-shrink: 0;
  background: linear-gradient(160deg, #f3f7ff, #e2ecff);
  box-shadow: 0 10rpx 28rpx rgba(20, 48, 111, 0.12);
}
.monogram {
  background: linear-gradient(160deg, #e6efff, #c9dbff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Songti SC', 'STSong', 'Noto Serif SC', serif;
  font-size: 96rpx;
  font-weight: 600;
  color: $brand;
}
.founder-info {
  flex: 1;
  min-width: 0;
}
.founder-name {
  font-size: 44rpx;
  font-weight: 600;
  letter-spacing: 6rpx;
}
.founder-title {
  margin: 6rpx 0 18rpx;
  padding-bottom: 18rpx;
  border-bottom: 1rpx solid $line;
  font-size: 26rpx;
  color: $brand;
  font-weight: 500;
}
.founder-tag {
  position: relative;
  padding-left: 22rpx;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #36405a;
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 12rpx;
    width: 8rpx;
    height: 8rpx;
    border-radius: 50%;
    background: $brand;
  }
}
.bio {
  margin-top: 24rpx;
}
.stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
  margin-top: 32rpx;
}
.stat {
  display: flex;
  flex-direction: column;
  padding: 24rpx 28rpx;
  border-radius: 20rpx;
  background: $brand-soft;
}
.stat-value {
  font-size: 48rpx;
  font-weight: 700;
  color: $brand;
  line-height: 1.2;
}
.stat-label {
  margin-top: 6rpx;
  font-size: 24rpx;
  color: $text-secondary;
}
.cta {
  padding: 16rpx 28rpx 0;
}
</style>
