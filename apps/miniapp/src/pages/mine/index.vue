<template>
  <NavBar title="我的" :opacity="navOpacity" />
  <view>
    <!-- 通铺渐变头部：头像、身份、数字统计 -->
    <view class="head" :style="{ paddingTop: `calc(${navBarHeight()}px + 24rpx)` }">
      <view class="head-rings" />
      <view class="profile">
        <image v-if="user.profile?.avatar" :src="user.profile.avatar" class="avatar" />
        <view v-else class="avatar">{{ (user.profile?.nickname || '微').slice(0, 1) }}</view>
        <view class="who">
          <view class="name">{{ user.profile?.nickname || '微信用户' }}</view>
          <text :class="['cert-badge', { ok: user.certified }]" @click="go('/pages/cert/index')">{{ certText || '未认证' }} ›</text>
        </view>
      </view>
      <view class="stats">
        <view v-for="st in stats" :key="st.label" class="stat" @click="st.go()">
          <text class="stat-num">{{ st.value ?? '-' }}</text>
          <text class="stat-label">{{ st.label }}</text>
        </view>
      </view>
    </view>

    <!-- 我的服务：线条图标宫格 -->
    <view class="card services">
      <view class="services-title">我的服务</view>
      <view class="service-grid">
        <view v-for="sv in services" :key="sv.name" class="service" @click="go(sv.url)">
          <image :src="staticUrl(`/static/icons/${sv.icon}.png`)" class="service-icon" mode="aspectFit" />
          <text>{{ sv.name }}</text>
        </view>
      </view>
    </view>

    <!-- 图块入口 -->
    <view class="tiles">
      <view class="tile brand" @click="go('/pages/about/index')">
        <text class="tile-title">品牌故事</text>
        <text class="tile-sub">析芒教育 · 创始人</text>
      </view>
      <view v-if="user.profile?.identityType === 'PRACTITIONER'" class="tile join" @click="go('/pages/join/index')">
        <text class="tile-title">合作招募</text>
        <text class="tile-sub">品牌协作 · 渠道合伙</text>
      </view>
      <view v-else class="tile schedule" @click="go('/pages/schedule/index')">
        <text class="tile-title">会议日程</text>
        <text class="tile-sub">线下课程安排</text>
      </view>
    </view>

    <view v-if="DEMO" class="card demo">
      <view class="demo-title">演示工具</view>
      <view class="muted">演示版数据只保存在本机。切换身份可对比医生 / 从业者看到的首页和课程。</view>
      <view class="demo-actions">
        <button size="mini" :class="user.profile?.identityType === 'DOCTOR' ? 'btn-primary' : 'btn-ghost'" @click="demoSwitch('DOCTOR')">切换为医生</button>
        <button size="mini" :class="user.profile?.identityType === 'PRACTITIONER' ? 'btn-primary' : 'btn-ghost'" @click="demoSwitch('PRACTITIONER')">切换为从业者</button>
        <button size="mini" class="btn-ghost" @click="demoReset">重新开始体验</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { CertStatusLabel, IdentityTypeLabel, type IdentityType } from '@luoji/shared';
import { onPageScroll, onShow } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';
import { api } from '@/api';
import NavBar from '@/components/NavBar.vue';
import { staticUrl } from '@/utils/static';
import { navBarHeight } from '@/utils/nav';
import { resetDemo, switchIdentity } from '@/demo/mock';
import { useUserStore } from '@/stores/user';

const user = useUserStore();

const certText = computed(() => {
  const p = user.profile;
  if (!p) return '';
  return p.certStatus === 'APPROVED' && p.identityType ? IdentityTypeLabel[p.identityType] : CertStatusLabel[p.certStatus];
});

const go = (url: string) => uni.navigateTo({ url });

const scrollTop = ref(0);
onPageScroll((e) => (scrollTop.value = e.scrollTop));
const navOpacity = computed(() => Math.min(1, scrollTop.value / 120));

/** 头部统计：未认证时不请求，显示「-」 */
const counts = ref<{ courses?: number; favorites?: number; coupons?: number; plans?: number }>({});
const stats = computed(() => [
  { label: '我的课程', value: counts.value.courses, go: () => uni.switchTab({ url: '/pages/learning/index' }) },
  { label: '收藏', value: counts.value.favorites, go: () => go('/pages/favorite/index') },
  { label: '优惠券', value: counts.value.coupons, go: () => go('/pages/coupon/mine') },
  { label: '日程', value: counts.value.plans, go: () => go('/pages/schedule/index?tab=mine') },
]);

async function loadCounts() {
  if (!user.certified) {
    counts.value = {};
    return;
  }
  const [courses, favorites, coupons, plans] = await Promise.all([api.myCourses(), api.favorites(), api.myCoupons('usable'), api.plans()]);
  counts.value = { courses: courses.length, favorites: favorites.length, coupons: coupons.length, plans: plans.length };
}

const services = [
  { name: '我的订单', icon: 'order', url: '/pages/order/list' },
  { name: '线下报名', icon: 'enroll', url: '/pages/offline/mine' },
  { name: '我的收藏', icon: 'favorite', url: '/pages/favorite/index' },
  { name: '优惠券', icon: 'coupon', url: '/pages/coupon/mine' },
  { name: '我的日程', icon: 'schedule', url: '/pages/schedule/index?tab=mine' },
  { name: '领券中心', icon: 'gift', url: '/pages/coupon/center' },
  { name: '身份认证', icon: 'cert', url: '/pages/cert/index' },
  { name: '关于我们', icon: 'brand', url: '/pages/about/index' },
];

const DEMO = import.meta.env.VITE_DEMO === 'true';

async function demoSwitch(identity: IdentityType) {
  switchIdentity(identity);
  await user.refreshProfile();
  await loadCounts();
  uni.showToast({ title: `已切换为${IdentityTypeLabel[identity]}`, icon: 'none' });
}

function demoReset() {
  uni.showModal({
    title: '重新开始体验',
    content: '将清空本机的演示数据（订单、优惠券、学习进度），回到未认证的新用户状态',
    success: async ({ confirm }) => {
      if (!confirm) return;
      resetDemo();
      user.profile = null;
      uni.reLaunch({ url: '/pages/index/index' });
    },
  });
}

// TODO(WP03)：头像昵称填写（chooseAvatar / nickname 输入框）、手机号授权
onShow(async () => {
  await user.ensureLogin();
  await user.refreshProfile().catch(() => undefined);
  await loadCounts().catch(() => undefined);
});
</script>

<style lang="scss" scoped>
.head {
  position: relative;
  overflow: hidden;
  padding: 0 36rpx 40rpx;
  background: linear-gradient(165deg, #dfeaff 0%, #c9dcff 45%, #eef4ff 100%);
}
.head-rings {
  position: absolute;
  right: -140rpx;
  top: -60rpx;
  width: 420rpx;
  height: 420rpx;
  border-radius: 50%;
  border: 2rpx solid rgba(255, 255, 255, 0.8);
  box-shadow:
    0 0 0 50rpx rgba(255, 255, 255, 0.18),
    0 0 0 52rpx rgba(255, 255, 255, 0.6);
}
.profile {
  position: relative;
  display: flex;
  align-items: center;
  gap: 28rpx;
}
.avatar {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  background: linear-gradient(150deg, #5d8ff5, #2a5bd7);
  border: 6rpx solid rgba(255, 255, 255, 0.9);
  flex-shrink: 0;
  color: #fff;
  font-size: 42rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}
.who {
  flex: 1;
  min-width: 0;
}
.name {
  font-size: 36rpx;
  font-weight: 600;
  color: $brand-deep;
  margin-bottom: 10rpx;
}
.cert-badge {
  display: inline-block;
  padding: 4rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.7);
  color: $text-secondary;
  font-size: 22rpx;
  &.ok {
    background: $brand-grad;
    color: #fff;
  }
}
.stats {
  position: relative;
  display: flex;
  margin-top: 44rpx;
}
.stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}
.stat-num {
  font-size: 40rpx;
  font-weight: 700;
  color: $brand-deep;
}
.stat-label {
  font-size: 24rpx;
  color: $text-secondary;
}
.services {
  margin-top: -16rpx;
  position: relative;
  padding: 32rpx 12rpx 8rpx;
}
.services-title {
  padding: 0 20rpx 20rpx;
  font-size: 28rpx;
  font-weight: 600;
}
.service-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
}
.service {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding-bottom: 32rpx;
  font-size: 24rpx;
}
.service-icon {
  width: 60rpx;
  height: 60rpx;
}
.tiles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
  margin: 0 28rpx;
}
.tile {
  position: relative;
  overflow: hidden;
  height: 168rpx;
  padding: 28rpx;
  box-sizing: border-box;
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  color: #fff;
  &::after {
    content: '';
    position: absolute;
    right: -50rpx;
    top: -50rpx;
    width: 170rpx;
    height: 170rpx;
    border-radius: 50%;
    border: 2rpx solid rgba(255, 255, 255, 0.4);
    box-shadow: 0 0 0 24rpx rgba(255, 255, 255, 0.08);
  }
  &.brand {
    background: linear-gradient(140deg, #4a80f5, #1f47b5);
  }
  &.join,
  &.schedule {
    background: linear-gradient(140deg, #8fb6ff, #4f80ea);
  }
}
.tile-title {
  font-size: 30rpx;
  font-weight: 600;
}
.tile-sub {
  margin-top: 4rpx;
  font-size: 22rpx;
  opacity: 0.85;
}
.demo {
  margin-top: 28rpx;
}
.demo-title {
  font-size: 28rpx;
  font-weight: 600;
  margin-bottom: 8rpx;
}
.demo-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 20rpx;
  button {
    margin: 0;
  }
}
</style>
