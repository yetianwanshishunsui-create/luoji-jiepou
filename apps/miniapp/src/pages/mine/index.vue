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

    <view v-if="DEMO" class="card demo">
      <view class="demo-title">演示工具</view>
      <view class="muted">演示版数据只保存在本机。切换身份可对比医生 / 从业者看到的首页和课程。</view>
      <view class="demo-actions">
        <button size="mini" :class="{ 'btn-primary': user.profile?.identityType === 'DOCTOR' }" @click="demoSwitch('DOCTOR')">切换为医生</button>
        <button size="mini" :class="{ 'btn-primary': user.profile?.identityType === 'PRACTITIONER' }" @click="demoSwitch('PRACTITIONER')">切换为从业者</button>
        <button size="mini" @click="demoReset">重新开始体验</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { CertStatusLabel, IdentityTypeLabel, type IdentityType } from '@luoji/shared';
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

const DEMO = import.meta.env.VITE_DEMO === 'true';

async function demoSwitch(identity: IdentityType) {
  const { switchIdentity } = await import('@/demo/mock');
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
      const { resetDemo } = await import('@/demo/mock');
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
