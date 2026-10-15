<template>
  <view v-if="sign">
    <!-- 视频：VOD 播放签名接入前（WP05）使用占位提示 -->
    <view v-if="sign.type === 'VIDEO'" class="player">
      <video
        v-if="videoSrc"
        id="player"
        :src="videoSrc"
        :initial-time="sign.resumeAt"
        class="video"
        :show-casting-button="false"
        @timeupdate="onTimeUpdate"
        @pause="flush"
        @ended="flush"
      />
      <view v-else class="video placeholder">视频播放待接入腾讯云点播（WP05）</view>
      <!-- 动态水印：用于追溯录屏外传 -->
      <view class="watermark" :style="{ top: wm.top, left: wm.left }">{{ watermark }}</view>
      <view v-if="trialEnded" class="trial-mask">
        <view>试看结束</view>
        <button class="btn-primary" size="mini" @click="goBuy">购买完整课程</button>
      </view>
    </view>

    <view v-else-if="sign.type === 'ARTICLE'" class="card">
      <rich-text :nodes="sign.contentHtml || ''" />
    </view>

    <view v-else class="card muted">音频播放待接入（WP05）</view>

    <view v-if="sign.access.mode === 'TRIAL'" class="card muted">
      可试看 {{ sign.access.trialSeconds }} 秒，购买后解锁完整内容
    </view>
  </view>
</template>

<script setup lang="ts">
import { onHide, onLoad, onUnload } from '@dcloudio/uni-app';
import { computed, reactive, ref } from 'vue';
import { api, type PlaySign } from '@/api';
import { useUserStore } from '@/stores/user';

/** 上报间隔（秒） */
const REPORT_INTERVAL = 15;

const user = useUserStore();
const sign = ref<PlaySign>();
const position = ref(0);
const total = ref(0);
const trialEnded = ref(false);
const wm = reactive({ top: '20%', left: '10%' });
let lessonId = '';
let productId = '';
let lastReported = 0;
let wmTimer: ReturnType<typeof setInterval> | undefined;

// TODO(WP05)：根据 fileId + psign 获取播放地址（腾讯云点播小程序播放器插件或 VOD 播放接口）
const videoSrc = computed(() => '');

const watermark = computed(() => {
  const p = user.profile;
  return `${p?.nickname ?? '学员'} ${p?.id.slice(-6) ?? ''}`;
});

function onTimeUpdate(e: Event) {
  const { currentTime, duration } = (e as unknown as { detail: { currentTime: number; duration: number } }).detail;
  position.value = Math.floor(currentTime);
  total.value = Math.floor(duration);

  if (sign.value?.access.mode === 'TRIAL' && position.value >= sign.value.access.trialSeconds) {
    uni.createVideoContext('player').pause();
    trialEnded.value = true;
  }
  if (position.value - lastReported >= REPORT_INTERVAL) flush();
}

function flush() {
  if (!lessonId || sign.value?.type === 'ARTICLE') return;
  lastReported = position.value;
  api.reportProgress({ lessonId, position: position.value, duration: total.value }).catch(() => undefined);
}

const goBuy = () => uni.redirectTo({ url: `/pages/course/detail?id=${productId}` });

onLoad(async (q) => {
  lessonId = String(q?.lessonId ?? '');
  productId = String(q?.productId ?? '');
  sign.value = await api.playSign(lessonId);
  position.value = lastReported = sign.value.resumeAt;
  if (sign.value.type === 'ARTICLE') api.reportProgress({ lessonId, position: 0, duration: 0 }).catch(() => undefined);

  wmTimer = setInterval(() => {
    wm.top = `${10 + Math.random() * 70}%`;
    wm.left = `${5 + Math.random() * 60}%`;
  }, 8000);
});

onHide(flush);
onUnload(() => {
  flush();
  clearInterval(wmTimer);
});
</script>

<style lang="scss" scoped>
.player {
  position: relative;
}
.video {
  width: 100%;
  height: 422rpx;
}
.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1d2421;
  color: #ccc;
}
.watermark {
  position: absolute;
  color: rgba(255, 255, 255, 0.35);
  font-size: 24rpx;
  pointer-events: none;
  transition: all 1s;
}
.trial-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
}
</style>
