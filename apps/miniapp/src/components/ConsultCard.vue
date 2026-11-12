<template>
  <!-- 课程顾问：引导学员添加微信，点击弹出二维码面板 -->
  <template v-if="config?.enabled">
    <view class="card full">
      <view class="full-text">
        <view class="full-title">{{ config.title }}</view>
        <view class="muted">{{ config.desc }}</view>
        <view class="full-steps">长按识别二维码 · 或复制微信号添加</view>
        <button class="btn-primary full-btn" size="mini" @click="open = true">添加顾问微信</button>
      </view>
      <view class="qr-mini" @click="open = true">
        <image v-if="config.qrImage" :src="config.qrImage" mode="aspectFit" class="qr-mini-img" />
        <text v-else class="qr-placeholder">顾问<br />二维码</text>
      </view>
    </view>

    <view v-if="open" class="mask" @click="open = false" />
    <view v-if="open" class="sheet">
      <view class="sheet-title">{{ config.title }}</view>
      <view class="muted center">{{ config.desc }}</view>
      <view class="qr-box">
        <image v-if="config.qrImage" :src="config.qrImage" mode="aspectFit" class="qr" show-menu-by-longpress />
        <view v-else class="qr qr-empty">
          <text>顾问二维码</text>
          <text class="muted">正式版由后台上传，长按即可识别</text>
        </view>
      </view>
      <view v-if="config.wechatId" class="wx-row">
        <text>微信号：{{ config.wechatId }}</text>
        <text class="copy" @click="copy">复制</text>
      </view>
      <view v-else class="muted center">演示版未配置顾问微信号</view>
      <button class="btn-ghost close" @click="open = false">我知道了</button>
    </view>
  </template>
</template>

<script setup lang="ts">
import type { ConsultConfig } from '@luoji/shared';
import { onMounted, ref } from 'vue';
import { api } from '@/api';

/** 顾问配置全局只取一次，各课程详情页共用 */
let cached: Promise<ConsultConfig> | null = null;
const config = ref<ConsultConfig>();
const open = ref(false);

onMounted(async () => {
  cached ??= api.consult().catch(() => {
    cached = null;
    throw new Error('consult unavailable');
  });
  config.value = await cached.catch(() => undefined);
});

const copy = () => uni.setClipboardData({ data: config.value?.wechatId ?? '', success: () => uni.showToast({ title: '已复制，去微信添加', icon: 'none' }) });
</script>

<style lang="scss" scoped>
.full {
  display: flex;
  align-items: center;
  gap: 24rpx;
  background: linear-gradient(135deg, #ffffff 50%, #eef4ff);
}
.full-text {
  flex: 1;
}
.full-title {
  font-size: 28rpx;
  font-weight: 600;
  margin-bottom: 6rpx;
}
.full-steps {
  margin-top: 10rpx;
  font-size: 22rpx;
  color: $text-weak;
}
.full-btn {
  margin: 20rpx 0 0;
  padding: 0 28rpx;
}
.qr-mini {
  width: 168rpx;
  height: 168rpx;
  border-radius: 16rpx;
  background: #fff;
  border: 2rpx dashed #c5d6f5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.qr-mini-img {
  width: 152rpx;
  height: 152rpx;
}
.qr-placeholder {
  font-size: 22rpx;
  color: $text-weak;
  text-align: center;
  line-height: 1.5;
}
.mask {
  position: fixed;
  inset: 0;
  background: rgba(10, 20, 45, 0.5);
  z-index: 20;
}
.sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 21;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 40rpx 40rpx calc(32rpx + env(safe-area-inset-bottom));
}
.sheet-title {
  text-align: center;
  font-size: 30rpx;
  font-weight: 600;
  margin-bottom: 8rpx;
}
.center {
  text-align: center;
}
.qr-box {
  display: flex;
  justify-content: center;
  margin: 32rpx 0 24rpx;
}
.qr {
  width: 360rpx;
  height: 360rpx;
}
.qr-empty {
  border-radius: 24rpx;
  border: 2rpx dashed #c5d6f5;
  background: $brand-soft;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  color: $brand-deep;
  font-size: 26rpx;
  text-align: center;
  padding: 0 40rpx;
  box-sizing: border-box;
}
.wx-row {
  display: flex;
  justify-content: center;
  gap: 24rpx;
  font-size: 26rpx;
}
.copy {
  color: $brand;
}
.close {
  margin-top: 32rpx;
}
</style>
