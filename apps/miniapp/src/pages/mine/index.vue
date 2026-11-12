<template>
  <view class="page">
    <!-- 学员证：身份、编号与学习数据 -->
    <view class="id-card">
      <view class="id-rings" />
      <view class="id-top">
        <image class="id-mark" src="/static/brand/wordmark-white.png" mode="heightFix" />
        <text class="id-label">学员证 · STUDENT</text>
      </view>
      <view class="id-main">
        <image v-if="user.profile?.avatar" :src="user.profile.avatar" class="avatar" />
        <view v-else class="avatar">{{ (user.profile?.nickname || '微').slice(0, 1) }}</view>
        <view class="who">
          <view class="name">{{ user.profile?.nickname || '微信用户' }}</view>
          <text class="cert" @click="go('/pages/cert/index')">{{ user.certified ? `认证${certText}` : certText || '未认证' }} ›</text>
        </view>
      </view>
      <view class="id-no">NO. {{ studentNo }}</view>
      <view class="id-stats">
        <view v-for="st in stats" :key="st.label" class="stat" @click="st.go()">
          <text class="stat-num">{{ st.value ?? '-' }}</text>
          <text class="stat-label">{{ st.label }}</text>
        </view>
      </view>
    </view>

    <!-- 分组菜单 -->
    <view v-for="g in groups" :key="g.title" class="group">
      <view class="group-title">{{ g.title }}</view>
      <view class="card menu">
        <view v-for="it in g.items" :key="it.name" class="menu-item" @click="it.go ? it.go() : it.url && go(it.url)">
          <image :src="staticUrl(`/static/icons/${it.icon}.png`)" class="menu-icon" mode="aspectFit" />
          <text class="menu-name">{{ it.name }}</text>
          <text class="menu-extra">{{ it.extra ?? '' }}</text>
          <text class="chev">›</text>
        </view>
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
import { onShow } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';
import { api } from '@/api';
import { staticUrl } from '@/utils/static';
import { resetDemo, switchIdentity } from '@/demo/mock';
import { useUserStore } from '@/stores/user';

const user = useUserStore();

const certText = computed(() => {
  const p = user.profile;
  if (!p) return '';
  return p.certStatus === 'APPROVED' && p.identityType ? IdentityTypeLabel[p.identityType] : CertStatusLabel[p.certStatus];
});

const go = (url: string) => uni.navigateTo({ url });

/** 学员编号：取用户 ID 末 8 位，正式版可改为后台生成的学号 */
const studentNo = computed(() => (user.profile?.id ?? '').slice(-8).toUpperCase() || '--------');

/** 学员证上的学习数据：未认证时不请求，显示「-」 */
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

interface MenuItem {
  name: string;
  icon: string;
  url?: string;
  go?: () => void;
  extra?: string;
}

const groups = computed<{ title: string; items: MenuItem[] }[]>(() => [
  {
    title: '学习',
    items: [
      { name: '我的课程', icon: 'online', go: () => uni.switchTab({ url: '/pages/learning/index' }) },
      { name: '我的日程', icon: 'schedule', url: '/pages/schedule/index?tab=mine' },
      { name: '我的收藏', icon: 'favorite', url: '/pages/favorite/index' },
    ],
  },
  {
    title: '订单与优惠',
    items: [
      { name: '我的订单', icon: 'order', url: '/pages/order/list' },
      { name: '线下报名', icon: 'enroll', url: '/pages/offline/mine' },
      { name: '优惠券', icon: 'coupon', url: '/pages/coupon/mine', extra: counts.value.coupons ? `${counts.value.coupons} 张可用` : '' },
      { name: '领券中心', icon: 'gift', url: '/pages/coupon/center' },
    ],
  },
  {
    title: '账户',
    items: [
      { name: '身份认证', icon: 'cert', url: '/pages/cert/index', extra: certText.value },
      { name: '关于逻辑解剖', icon: 'brand', url: '/pages/about/index', extra: '品牌与创始人' },
    ],
  },
]);

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
.page {
  padding-bottom: 32rpx;
}
.id-card {
  position: relative;
  overflow: hidden;
  margin: 24rpx 28rpx 0;
  padding: 32rpx 36rpx 28rpx;
  border-radius: 28rpx;
  background: linear-gradient(135deg, #4a80f5 0%, #2a5bd7 50%, #1d3c8f 100%);
  color: #fff;
  box-shadow: 0 18rpx 40rpx rgba(29, 60, 143, 0.28);
}
.id-rings {
  position: absolute;
  right: -130rpx;
  top: -150rpx;
  width: 420rpx;
  height: 420rpx;
  border-radius: 50%;
  border: 2rpx solid rgba(255, 255, 255, 0.25);
  box-shadow:
    0 0 0 46rpx rgba(255, 255, 255, 0.05),
    0 0 0 48rpx rgba(255, 255, 255, 0.15);
}
.id-top {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.id-mark {
  height: 36rpx;
}
.id-label {
  font-size: 18rpx;
  letter-spacing: 4rpx;
  opacity: 0.8;
}
.id-main {
  position: relative;
  display: flex;
  align-items: center;
  gap: 22rpx;
  margin-top: 30rpx;
}
.avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.18);
  flex-shrink: 0;
  font-size: 38rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}
.who {
  min-width: 0;
}
.name {
  font-size: 32rpx;
  font-weight: 600;
}
.cert {
  display: inline-block;
  margin-top: 6rpx;
  padding: 2rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.18);
  font-size: 20rpx;
}
.id-no {
  position: relative;
  margin-top: 22rpx;
  font-family: Menlo, Consolas, monospace;
  font-size: 22rpx;
  letter-spacing: 4rpx;
  opacity: 0.75;
}
.id-stats {
  position: relative;
  display: flex;
  margin-top: 22rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.2);
}
.stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}
.stat-num {
  font-size: 32rpx;
  font-weight: 600;
}
.stat-label {
  font-size: 20rpx;
  opacity: 0.75;
}
.group {
  margin-top: 28rpx;
}
.group-title {
  padding: 0 40rpx 4rpx;
  font-size: 22rpx;
  color: $text-weak;
  letter-spacing: 2rpx;
}
.menu {
  margin-top: 10rpx;
  padding: 0 28rpx;
}
.menu-item {
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 26rpx 0;
  border-bottom: 1rpx solid $line;
  &:last-child {
    border-bottom: none;
  }
}
.menu-icon {
  width: 40rpx;
  height: 40rpx;
}
.menu-name {
  flex: 1;
  font-size: 26rpx;
}
.menu-extra {
  font-size: 22rpx;
  color: $text-weak;
}
.chev {
  font-size: 28rpx;
  color: $text-weak;
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
