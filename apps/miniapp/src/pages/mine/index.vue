<template>
  <view>
    <view class="profile">
      <image v-if="user.profile?.avatar" :src="user.profile.avatar" class="avatar" />
      <view v-else class="avatar">{{ (user.profile?.nickname || '微').slice(0, 1) }}</view>
      <view class="who">
        <view class="name">{{ user.profile?.nickname || '微信用户' }}</view>
        <view class="muted">{{ user.profile?.phoneMasked || '未绑定手机号' }}</view>
      </view>
      <text :class="['cert-badge', { ok: user.certified }]" @click="go('/pages/cert/index')">{{ certText || '未认证' }}</text>
    </view>

    <view class="card quick">
      <view class="quick-item" @click="go('/pages/order/list')">
        <view class="quick-icon">单</view>
        <text>我的订单</text>
      </view>
      <view class="quick-item" @click="go('/pages/offline/mine')">
        <view class="quick-icon">报</view>
        <text>线下报名</text>
      </view>
      <view class="quick-item" @click="go('/pages/coupon/mine')">
        <view class="quick-icon">券</view>
        <text>优惠券</text>
      </view>
      <view class="quick-item" @click="go('/pages/schedule/index?tab=mine')">
        <view class="quick-icon">程</view>
        <text>我的日程</text>
      </view>
    </view>

    <view class="card menu">
      <view class="menu-item" @click="go('/pages/cert/index')">
        <text>身份认证</text>
        <text class="muted">{{ certText }} ›</text>
      </view>
      <view class="menu-item" @click="go('/pages/coupon/center')">
        <text>领券中心</text>
        <text class="muted">›</text>
      </view>
      <view class="menu-item" @click="go('/pages/about/index')">
        <text>关于逻辑解剖</text>
        <text class="muted">品牌与创始人 ›</text>
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
import { computed } from 'vue';
import { resetDemo, switchIdentity } from '@/demo/mock';
import { useUserStore } from '@/stores/user';

const user = useUserStore();

const certText = computed(() => {
  const p = user.profile;
  if (!p) return '';
  return p.certStatus === 'APPROVED' && p.identityType ? IdentityTypeLabel[p.identityType] : CertStatusLabel[p.certStatus];
});

const go = (url: string) => uni.navigateTo({ url });

const DEMO = import.meta.env.VITE_DEMO === 'true';

async function demoSwitch(identity: IdentityType) {
  switchIdentity(identity);
  await user.refreshProfile();
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
});
</script>

<style lang="scss" scoped>
.profile {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 40rpx 36rpx 16rpx;
}
.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: linear-gradient(150deg, #5d8ff5, #2a5bd7);
  border: 6rpx solid #fff;
  box-shadow: $shadow;
  flex-shrink: 0;
  color: #fff;
  font-size: 44rpx;
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
  margin-bottom: 6rpx;
}
.cert-badge {
  flex-shrink: 0;
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  background: #fff;
  color: $text-secondary;
  font-size: 22rpx;
  &.ok {
    background: $brand-grad;
    color: #fff;
  }
}
.quick {
  display: flex;
  justify-content: space-around;
  padding: 32rpx 12rpx;
}
.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  font-size: 24rpx;
}
.quick-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 24rpx;
  background: linear-gradient(160deg, #f3f7ff, #dde8ff);
  color: $brand;
  font-size: 30rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}
.menu {
  padding: 0 32rpx;
}
.menu-item {
  display: flex;
  justify-content: space-between;
  padding: 32rpx 0;
  border-bottom: 1rpx solid $line;
  &:last-child {
    border-bottom: none;
  }
}
.demo-title {
  font-size: 30rpx;
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
