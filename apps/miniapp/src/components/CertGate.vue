<template>
  <!-- 认证准入：未认证时替代页面内容，引导用户认证 -->
  <view v-if="!user.certified" class="gate card">
    <view class="title">{{ title }}</view>
    <view class="muted desc">{{ desc }}</view>
    <button v-if="status !== 'PENDING'" class="btn-primary" @click="goCert">去认证</button>
  </view>
  <slot v-else />
</template>

<script setup lang="ts">
import { CertStatus } from '@luoji/shared';
import { computed } from 'vue';
import { useUserStore } from '@/stores/user';

const user = useUserStore();
const status = computed(() => user.profile?.certStatus ?? CertStatus.UNSUBMITTED);

const title = computed(() =>
  status.value === CertStatus.PENDING ? '认证审核中' : status.value === CertStatus.REJECTED ? '认证未通过' : '完成身份认证后即可学习',
);
const desc = computed(() =>
  status.value === CertStatus.PENDING
    ? '我们会尽快完成审核，结果将通过服务通知告知你'
    : '本平台面向医生与从业者开放，请先提交身份信息与证件',
);

const goCert = () => uni.navigateTo({ url: '/pages/cert/index' });
</script>

<style lang="scss" scoped>
.gate {
  margin-top: 120rpx;
  text-align: center;
  padding: 64rpx 40rpx;
}
.title {
  font-size: 36rpx;
  font-weight: 600;
}
.desc {
  margin: 20rpx 0 48rpx;
  line-height: 1.6;
}
</style>
