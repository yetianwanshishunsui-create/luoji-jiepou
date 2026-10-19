<template>
  <view>
    <!-- 内容由后台「运营配置 → 招商页」维护 -->
    <view class="card hero" :style="page.hero.image ? { backgroundImage: `url(${page.hero.image})` } : {}">
      <view class="hero-title">{{ page.hero.title }}</view>
      <view class="hero-sub">{{ page.hero.subtitle }}</view>
    </view>

    <view v-if="page.benefits.length" class="card">
      <view class="block-title">合作权益</view>
      <view class="benefits">
        <view v-for="(b, i) in page.benefits" :key="i" class="benefit">
          <view class="item-title">{{ b.title }}</view>
          <view class="muted desc">{{ b.desc }}</view>
        </view>
      </view>
    </view>

    <view v-if="page.cases.length" class="card">
      <view class="block-title">合作案例</view>
      <view v-for="(c, i) in page.cases" :key="i" class="case">
        <image v-if="c.image" :src="c.image" mode="aspectFill" class="case-img" />
        <view class="item-title">{{ c.title }}</view>
        <view class="muted desc">{{ c.desc }}</view>
      </view>
    </view>

    <view v-if="page.faqs.length" class="card">
      <view class="block-title">常见问题</view>
      <view v-for="(f, i) in page.faqs" :key="i" class="faq" @click="openFaq = openFaq === i ? -1 : i">
        <view class="faq-q">
          <text>{{ f.q }}</text>
          <text class="muted">{{ openFaq === i ? '−' : '+' }}</text>
        </view>
        <view v-if="openFaq === i" class="muted desc">{{ f.a }}</view>
      </view>
    </view>

    <view v-if="done" class="card done">
      <view class="done-title">提交成功</view>
      <view class="muted">{{ page.successText }}</view>
    </view>

    <view v-else class="card">
      <view class="block-title">{{ page.formTitle }}</view>
      <view class="label">姓名 *</view>
      <input v-model="form.name" class="input" maxlength="32" />
      <view class="label">手机号 *</view>
      <input v-model="form.phone" class="input" type="number" maxlength="11" />
      <view class="label">城市</view>
      <input v-model="form.city" class="input" maxlength="32" />
      <view class="label">机构名称</view>
      <input v-model="form.organization" class="input" maxlength="64" />
      <view class="label">合作意向</view>
      <textarea v-model="form.intention" class="textarea" maxlength="255" placeholder="简单介绍你的需求" />

      <checkbox-group @change="onAgree">
        <label class="agree">
          <checkbox value="agree" :checked="agreed" color="#2A5BD7" />
          <text class="muted">我已阅读并同意《个人信息保护说明》</text>
        </label>
      </checkbox-group>
      <button class="btn-primary" :loading="submitting" :disabled="!canSubmit" @click="submit">{{ page.submitText }}</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { DEFAULT_JOIN_PAGE, type JoinPageConfig } from '@luoji/shared';
import { onLoad } from '@dcloudio/uni-app';
import { computed, reactive, ref } from 'vue';
import { api } from '@/api';

const page = ref<JoinPageConfig>(DEFAULT_JOIN_PAGE);
const openFaq = ref(-1);

const form = reactive({ name: '', phone: '', city: '', organization: '', intention: '' });
const agreed = ref(false);
const submitting = ref(false);
const done = ref(false);

const onAgree = (e: Event) => {
  agreed.value = (e as unknown as { detail: { value: string[] } }).detail.value.length > 0;
};

const canSubmit = computed(() => agreed.value && !!form.name.trim() && /^1\d{10}$/.test(form.phone));

async function submit() {
  submitting.value = true;
  try {
    const data = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim() || undefined])) as typeof form;
    await api.submitLead(data);
    done.value = true;
  } finally {
    submitting.value = false;
  }
}

onLoad(async () => {
  // 加载失败时保持默认文案，表单仍可提交
  page.value = await api.joinPage().catch(() => DEFAULT_JOIN_PAGE);
});
</script>

<style lang="scss" scoped>
.hero {
  background: linear-gradient(135deg, $brand, $brand-deep) center / cover;
  color: #fff;
  padding: 48rpx 32rpx;
}
.hero-title {
  font-size: 40rpx;
  font-weight: 600;
  margin-bottom: 12rpx;
}
.hero-sub {
  font-size: 26rpx;
  opacity: 0.9;
}
.block-title {
  font-size: 32rpx;
  font-weight: 600;
  margin-bottom: 20rpx;
}
.benefits {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.benefit {
  width: calc(50% - 8rpx);
  box-sizing: border-box;
  padding: 20rpx;
  border-radius: 12rpx;
  background: $brand-light;
}
.item-title {
  font-weight: 500;
}
.desc {
  margin-top: 8rpx;
  line-height: 1.6;
  white-space: pre-wrap;
}
.case,
.faq {
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f2f1;
  &:last-child {
    border-bottom: none;
  }
}
.case-img {
  width: 100%;
  height: 280rpx;
  border-radius: 12rpx;
  margin-bottom: 12rpx;
}
.faq-q {
  display: flex;
  justify-content: space-between;
  font-weight: 500;
}
.label {
  margin: 24rpx 0 12rpx;
}
.input {
  height: 80rpx;
  padding: 0 20rpx;
  border-radius: 12rpx;
  background: $bg;
}
.textarea {
  width: auto;
  height: 160rpx;
  padding: 20rpx;
  border-radius: 12rpx;
  background: $bg;
}
.agree {
  display: flex;
  align-items: center;
  margin: 28rpx 0;
}
.done {
  text-align: center;
  padding: 60rpx 0;
}
.done-title {
  font-size: 36rpx;
  font-weight: 600;
  margin-bottom: 16rpx;
  color: $brand;
}
</style>
