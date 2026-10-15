<template>
  <view>
    <view class="card profile">
      <image v-if="user.profile?.avatar" :src="user.profile.avatar" class="avatar" />
      <view v-else class="avatar" />
      <view>
        <view class="name">{{ user.profile?.nickname || '微信用户' }}</view>
        <view class="muted">{{ user.profile?.phoneMasked || '未绑定手机号' }}</view>
      </view>
    </view>

    <view class="card menu">
      <view class="menu-item" @click="go('/pages/cert/index')">
        <text>身份认证</text>
        <text class="muted">{{ certText }} ›</text>
      </view>
      <view class="menu-item" @click="go('/pages/coupon/mine')">
        <text>优惠券</text>
        <text class="muted">›</text>
      </view>
      <view class="menu-item" @click="go('/pages/offline/mine')">
        <text>我的报名</text>
        <text class="muted">›</text>
      </view>
      <view class="menu-item" @click="go('/pages/order/list')">
        <text>我的订单</text>
        <text class="muted">›</text>
      </view>
      <view class="menu-item" @click="go('/pages/join/index')">
        <text>从业者合作</text>
        <text class="muted">›</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { CertStatusLabel, IdentityTypeLabel } from '@luoji/shared';
import { onShow } from '@dcloudio/uni-app';
import { computed } from 'vue';
import { useUserStore } from '@/stores/user';

const user = useUserStore();

const certText = computed(() => {
  const p = user.profile;
  if (!p) return '';
  return p.certStatus === 'APPROVED' && p.identityType ? IdentityTypeLabel[p.identityType] : CertStatusLabel[p.certStatus];
});

const go = (url: string) => uni.navigateTo({ url });

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
}
.avatar {
  width: 112rpx;
  height: 112rpx;
  border-radius: 50%;
  background: $brand-light;
}
.name {
  font-size: 34rpx;
  font-weight: 600;
  margin-bottom: 8rpx;
}
.menu {
  padding: 0 28rpx;
}
.menu-item {
  display: flex;
  justify-content: space-between;
  padding: 32rpx 0;
  border-bottom: 1rpx solid #f0f2f1;
  &:last-child {
    border-bottom: none;
  }
}
</style>
