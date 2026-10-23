<template>
  <view class="page">
    <view v-if="summary" class="card summary">
      <view class="score">{{ summary.avgRating != null ? summary.avgRating.toFixed(1) : '--' }}</view>
      <view>
        <view class="stars">
          <text v-for="n in 5" :key="n" :class="['star', { on: summary.avgRating != null && n <= Math.round(summary.avgRating) }]">★</text>
        </view>
        <view class="muted">共 {{ summary.count }} 条评价 · 仅购买过的学员可评价</view>
      </view>
    </view>

    <view v-if="summary?.mine && summary.mine.status !== 'VISIBLE'" class="mine-tip">
      {{ summary.mine.status === 'PENDING' ? '你的评价已提交，审核通过后展示' : '你的评价未通过审核，可修改后重新提交' }}
    </view>

    <view class="card">
      <ReviewItem v-for="r in list" :key="r.id" :review="r" />
      <view class="muted footer">{{ loading ? '加载中…' : finished ? (list.length ? '没有更多了' : '还没有评价') : '' }}</view>
    </view>

    <view v-if="summary?.canReview" class="bar">
      <button class="btn-primary" @click="openForm">{{ summary.mine ? '修改我的评价' : '写评价' }}</button>
    </view>

    <!-- 写评价 -->
    <view v-if="writing" class="mask" @click="writing = false" />
    <view v-if="writing" class="sheet">
      <view class="sheet-title">{{ summary?.mine ? '修改评价' : '写评价' }}</view>
      <view class="rate">
        <text class="label">评分</text>
        <text v-for="n in 5" :key="n" :class="['star big', { on: n <= form.rating }]" @click="form.rating = n">★</text>
        <text class="muted">{{ rateText[form.rating] }}</text>
      </view>
      <textarea
        v-model="form.content"
        class="textarea"
        maxlength="500"
        placeholder="说说这门课对你的帮助，至少 5 个字"
        :show-confirm-bar="false"
      />
      <view class="muted count">{{ form.content.trim().length }}/500</view>
      <checkbox-group @change="onAnonymous">
        <label class="anon">
          <checkbox value="anon" :checked="form.anonymous" color="#2A5BD7" />
          <text>匿名评价（显示为「匿名用户」）</text>
        </label>
      </checkbox-group>
      <button class="btn-primary" :loading="submitting" :disabled="!valid" @click="submit">提交</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onLoad, onReachBottom } from '@dcloudio/uni-app';
import { computed, reactive, ref } from 'vue';
import { api, type ReviewPage, type ReviewView } from '@/api';
import ReviewItem from '@/components/ReviewItem.vue';

const rateText = ['', '很差', '较差', '一般', '推荐', '强烈推荐'];
let productId = '';
const summary = ref<ReviewPage>();
const list = ref<ReviewView[]>([]);
const page = ref(1);
const loading = ref(false);
const finished = ref(false);

async function fetchPage(reset = false) {
  if (loading.value || (!reset && finished.value)) return;
  if (reset) {
    page.value = 1;
    finished.value = false;
  }
  loading.value = true;
  try {
    const res = await api.reviews(productId, { page: page.value, pageSize: 20 });
    summary.value = res;
    list.value = reset ? res.list : [...list.value, ...res.list];
    finished.value = list.value.length >= res.count;
    page.value += 1;
  } finally {
    loading.value = false;
  }
}

// ───────── 写评价 ─────────
const writing = ref(false);
const submitting = ref(false);
const form = reactive({ rating: 5, content: '', anonymous: false });
const valid = computed(() => form.rating >= 1 && form.content.trim().length >= 5);

function openForm() {
  const mine = summary.value?.mine;
  form.rating = mine?.rating ?? 5;
  form.content = mine?.content ?? '';
  form.anonymous = mine?.anonymous ?? false;
  writing.value = true;
}

const onAnonymous = (e: { detail: { value: string[] } }) => (form.anonymous = e.detail.value.includes('anon'));

async function submit() {
  submitting.value = true;
  try {
    const res = await api.submitReview(productId, { rating: form.rating, content: form.content.trim(), anonymous: form.anonymous });
    writing.value = false;
    uni.showToast({ title: res.status === 'VISIBLE' ? '评价已发布' : '已提交，审核后展示', icon: 'none' });
    await fetchPage(true);
  } catch {
    /* 提示已在 request 中处理 */
  } finally {
    submitting.value = false;
  }
}

onLoad(async (q) => {
  productId = String(q?.id ?? '');
  await fetchPage(true);
  if (q?.write && summary.value?.canReview) openForm();
});
onReachBottom(() => fetchPage());
</script>

<style lang="scss" scoped>
.page {
  padding-bottom: 160rpx;
}
.summary {
  display: flex;
  align-items: center;
  gap: 28rpx;
}
.score {
  font-size: 72rpx;
  font-weight: 700;
  color: #f5a623;
}
.stars {
  margin-bottom: 6rpx;
}
.star {
  font-size: 30rpx;
  color: #d9dde6;
  margin-right: 6rpx;
  &.on {
    color: #f5a623;
  }
  &.big {
    font-size: 48rpx;
    margin-right: 12rpx;
  }
}
.mine-tip {
  margin: 0 24rpx 24rpx;
  padding: 14rpx 20rpx;
  border-radius: 12rpx;
  background: #fff8ee;
  color: #b45309;
  font-size: 24rpx;
}
.footer {
  text-align: center;
  padding: 24rpx 0 8rpx;
}
.bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.04);
}
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 10;
}
.sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 11;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 32rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
}
.sheet-title {
  text-align: center;
  font-size: 32rpx;
  font-weight: 600;
  margin-bottom: 24rpx;
}
.rate {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}
.label {
  margin-right: 20rpx;
  font-weight: 500;
}
.textarea {
  width: 100%;
  height: 240rpx;
  padding: 20rpx;
  box-sizing: border-box;
  border-radius: 12rpx;
  background: $bg;
  font-size: 28rpx;
}
.count {
  text-align: right;
  margin: 8rpx 0 12rpx;
}
.anon {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 26rpx;
  margin-bottom: 24rpx;
}
</style>
