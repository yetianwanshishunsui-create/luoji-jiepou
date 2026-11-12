<template>
  <!-- 自定义导航栏：页面顶部通铺时透明，滚动后变为白底；小程序右上角胶囊按钮由系统绘制 -->
  <view class="nav" :style="{ paddingTop: `${statusBar}px`, background: `rgba(255,255,255,${opacity})`, boxShadow: opacity > 0.9 ? '0 2rpx 12rpx rgba(20,48,111,0.06)' : 'none' }">
    <view class="bar">
      <image v-if="logo" class="logo" src="/static/brand/wordmark.png" mode="heightFix" aria-label="逻辑解剖" />
      <text v-else class="title">{{ title }}</text>
    </view>
  </view>
  <!-- 占位：非通铺页面需要把内容推到导航栏下方 -->
  <view v-if="placeholder" :style="{ height: `${statusBar + 44}px` }" />
</template>

<script setup lang="ts">
withDefaults(defineProps<{ title?: string; logo?: boolean; opacity?: number; placeholder?: boolean }>(), {
  title: '',
  logo: false,
  opacity: 0,
  placeholder: false,
});

const statusBar = uni.getSystemInfoSync().statusBarHeight ?? 0;
</script>

<style lang="scss" scoped>
.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  transition: background 0.2s;
}
.bar {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.logo {
  height: 26px;
}
.title {
  font-size: 17px;
  font-weight: 600;
  color: $text;
}
</style>
