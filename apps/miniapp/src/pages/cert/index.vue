<template>
  <view>
    <view v-if="state?.certStatus === 'PENDING'" class="card status">
      <view class="status-title">审核中</view>
      <view class="muted">已收到你的认证资料，审核通过后会通过服务通知告知你</view>
      <view v-if="DEMO" class="muted demo-tip">演示版：约 3 秒后自动审核通过</view>
    </view>

    <view v-else-if="state?.certStatus === 'APPROVED'" class="card status">
      <view class="status-title">已认证 · {{ state.identityType ? IdentityTypeLabel[state.identityType] : '' }}</view>
      <button class="btn-primary" @click="goHome">开始学习</button>
    </view>

    <template v-else>
      <view v-if="state?.latest?.status === 'REJECTED'" class="card reject">
        上次认证未通过：{{ state.latest.rejectReason }}
      </view>

      <view class="card">
        <view class="label">选择身份</view>
        <view class="identity">
          <view
            v-for="t in identities"
            :key="t"
            :class="['identity-item', { active: form.identityType === t }]"
            @click="form.identityType = t"
          >
            {{ IdentityTypeLabel[t] }}
          </view>
        </view>

        <view class="label">真实姓名</view>
        <input v-model="form.realName" class="input" maxlength="32" placeholder="与证件一致" />

        <view class="label">{{ form.identityType === 'DOCTOR' ? '医师执业证号' : '资格证 / 工作证编号' }}（选填）</view>
        <input v-model="form.licenseNo" class="input" maxlength="64" placeholder="便于加快审核" />

        <view class="label">{{ form.identityType === 'DOCTOR' ? '所在医院' : '所在机构' }}（选填）</view>
        <input v-model="form.organization" class="input" maxlength="128" />

        <view class="label">证件照片（{{ files.length }}/6）</view>
        <view class="files">
          <image v-for="(f, i) in files" :key="f.key" :src="f.local" class="file" mode="aspectFill" @click="remove(i)" />
          <view v-if="files.length < 6" class="file add" @click="choose">+</view>
        </view>
        <view class="muted tip">证件仅用于身份审核，加密存储，不会对外展示</view>
      </view>

      <view class="actions">
        <button class="btn-primary" :loading="submitting" :disabled="!canSubmit" @click="submit">提交认证</button>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { IdentityType, IdentityTypeLabel, type CertStatus } from '@luoji/shared';
import { onShow } from '@dcloudio/uni-app';
import { computed, reactive, ref } from 'vue';
import { api } from '@/api';
import { useUserStore } from '@/stores/user';

const identities = Object.values(IdentityType);
const user = useUserStore();
const state = ref<{
  certStatus: CertStatus;
  identityType: IdentityType | null;
  latest: { status: CertStatus; rejectReason: string | null } | null;
}>();
const form = reactive({ identityType: IdentityType.DOCTOR as IdentityType, realName: '', licenseNo: '', organization: '' });
const files = ref<{ local: string; key: string }[]>([]);
const submitting = ref(false);

const DEMO = import.meta.env.VITE_DEMO === 'true';
// 演示版可不传证件直接提交
const canSubmit = computed(() => !!form.realName.trim() && (files.value.length > 0 || DEMO));

/**
 * 选择证件照片并直传 COS 私有桶。
 * TODO(WP03)：用 upload-sign 返回的 STS 临时密钥直传到 cert/{userId}/ 前缀，拿到对象 key。
 */
async function choose() {
  const res = await new Promise<UniApp.ChooseImageSuccessCallbackResult>((resolve, reject) =>
    uni.chooseImage({ count: 6 - files.value.length, sizeType: ['compressed'], success: resolve, fail: reject }),
  ).catch(() => null);
  if (!res) return;

  try {
    const sign = await api.certUploadSign();
    if ((sign as { demo?: boolean } | null)?.demo) {
      // 演示版：只在本机预览，不上传
      ([] as string[]).concat(res.tempFilePaths).forEach((local, i) => files.value.push({ local, key: `demo-${Date.now()}-${i}` }));
      return;
    }
  } catch {
    uni.showToast({ title: '证件上传服务接入中（WP03）', icon: 'none' });
    return;
  }
  // 接入后：逐个上传并 push({ local, key })
}

const remove = (i: number) => files.value.splice(i, 1);
const goHome = () => uni.switchTab({ url: '/pages/index/index' });

async function submit() {
  submitting.value = true;
  try {
    await api.certSubmit({
      identityType: form.identityType,
      realName: form.realName.trim(),
      licenseNo: form.licenseNo.trim() || undefined,
      organization: form.organization.trim() || undefined,
      files: files.value.map((f) => f.key),
    });
    // TODO(WP03)：提交后请求订阅消息授权（审核结果通知）
    uni.showToast({ title: '已提交，等待审核', icon: 'success' });
    await Promise.all([load(), user.refreshProfile()]);
    if (DEMO) setTimeout(() => Promise.all([load(), user.refreshProfile()]).catch(() => undefined), 3200);
  } finally {
    submitting.value = false;
  }
}

async function load() {
  state.value = await api.certMine();
  if (state.value.identityType) form.identityType = state.value.identityType;
}

onShow(async () => {
  await user.ensureLogin();
  await load();
});
</script>

<style lang="scss" scoped>
.status {
  text-align: center;
  padding: 60rpx 40rpx;
}
.status-title {
  font-size: 36rpx;
  font-weight: 600;
  margin-bottom: 24rpx;
}
.reject {
  color: #d4380d;
  background: #fff2ee;
}
.label {
  margin: 28rpx 0 12rpx;
  font-weight: 500;
}
.identity {
  display: flex;
  gap: 24rpx;
}
.identity-item {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  border-radius: 12rpx;
  border: 2rpx solid #e3e8e5;
  &.active {
    border-color: $brand;
    color: $brand;
    background: $brand-light;
  }
}
.input {
  height: 80rpx;
  padding: 0 20rpx;
  border-radius: 12rpx;
  background: $bg;
}
.files {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.file {
  width: 200rpx;
  height: 150rpx;
  border-radius: 12rpx;
  background: $bg;
}
.add {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 60rpx;
  color: $text-secondary;
}
.demo-tip {
  margin-top: 16rpx;
  color: $brand;
}
.tip {
  margin-top: 16rpx;
}
.actions {
  padding: 0 24rpx 60rpx;
}
</style>
