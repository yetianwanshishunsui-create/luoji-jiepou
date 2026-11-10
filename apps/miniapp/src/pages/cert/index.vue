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
        <view class="step">1 · 选择身份</view>
        <view class="identity">
          <view
            v-for="t in identities"
            :key="t"
            :class="['identity-item', { active: form.identityType === t }]"
            @click="form.identityType = t"
          >
            <text class="identity-name">{{ IdentityTypeLabel[t] }}</text>
            <text class="identity-desc">{{ t === 'DOCTOR' ? '执业医师' : '机构 / 品牌 / 渠道' }}</text>
          </view>
        </view>
      </view>

      <view class="card">
        <view class="step">2 · 填写信息</view>
        <template v-if="isDoctor">
          <view class="field">
            <text class="label">姓名</text>
            <input v-model="form.realName" class="input" maxlength="32" placeholder="与执业证一致" />
          </view>
          <picker :range="PROVINCES" :value="provinceIndex" @change="onProvince">
            <view class="field">
              <text class="label">省份</text>
              <text :class="['input', 'pick', { empty: !form.province }]">{{ form.province || '请选择' }}</text>
              <text class="chev">›</text>
            </view>
          </picker>
          <view class="field">
            <text class="label">城市</text>
            <input v-model="form.city" class="input" maxlength="32" placeholder="如 杭州" />
          </view>
        </template>
        <view class="field">
          <text class="label">机构</text>
          <input v-model="form.organization" class="input" maxlength="128" :placeholder="isDoctor ? '所在医院 / 机构全称' : '所在机构全称'" />
        </view>
        <view v-if="isDoctor" class="field">
          <text class="label">科室</text>
          <input v-model="form.department" class="input" maxlength="64" placeholder="如 整形外科" />
        </view>
        <view v-else class="field">
          <text class="label">职位</text>
          <input v-model="form.position" class="input" maxlength="64" placeholder="如 咨询师、店长" />
        </view>
        <view class="field last">
          <text class="label">电话</text>
          <input v-model="form.phone" class="input" type="number" maxlength="11" placeholder="手机号" />
        </view>
      </view>

      <view class="card">
        <view class="step">
          3 · {{ isDoctor ? '上传执业证照片' : '上传工作证 / 胸牌' }}
          <text class="optional">{{ isDoctor ? '必填' : '选填' }}</text>
        </view>
        <view class="files">
          <image v-for="(f, i) in files" :key="f.key" :src="f.local" class="file" mode="aspectFill" @click="remove(i)" />
          <view v-if="files.length < 6" class="file add" @click="choose">
            <text class="plus">+</text>
            <text class="add-text">{{ isDoctor ? '执业证' : '工作证 / 胸牌' }}</text>
          </view>
        </view>
        <view class="muted tip">证件仅用于身份审核，加密存储，不会对外展示；点击已选照片可删除</view>
      </view>

      <view class="actions">
        <button class="btn-primary" :loading="submitting" :disabled="!canSubmit" @click="submit">提交认证</button>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { IdentityType, IdentityTypeLabel, PROVINCES, type CertStatus } from '@luoji/shared';
import { onShow } from '@dcloudio/uni-app';
import { computed, reactive, ref, watch } from 'vue';
import { api } from '@/api';
import { useUserStore } from '@/stores/user';

const identities = Object.values(IdentityType);
const user = useUserStore();
const state = ref<{
  certStatus: CertStatus;
  identityType: IdentityType | null;
  latest: { status: CertStatus; rejectReason: string | null } | null;
}>();
const form = reactive({
  identityType: IdentityType.DOCTOR as IdentityType,
  realName: '',
  province: '',
  city: '',
  organization: '',
  department: '',
  position: '',
  phone: '',
});
const isDoctor = computed(() => form.identityType === IdentityType.DOCTOR);
const provinceIndex = computed(() => Math.max(0, PROVINCES.indexOf(form.province as (typeof PROVINCES)[number])));
const onProvince = (e: { detail: { value: number | string } }) => (form.province = PROVINCES[Number(e.detail.value)]);
const files = ref<{ local: string; key: string }[]>([]);
const submitting = ref(false);

const DEMO = import.meta.env.VITE_DEMO === 'true';
const filled = (v: string) => !!v.trim();
/** 医生：姓名、省份、城市、机构、科室、电话、执业证照片全部必填；从业者：电话、机构、职位必填，照片选填 */
const canSubmit = computed(() =>
  isDoctor.value
    ? [form.realName, form.province, form.city, form.organization, form.department].every(filled) && /^1\d{10}$/.test(form.phone) && files.value.length > 0
    : [form.organization, form.position].every(filled) && /^1\d{10}$/.test(form.phone),
);

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
// 两种身份要传的证件不同，切换身份时清空已选照片
watch(
  () => form.identityType,
  () => (files.value = []),
);
const goHome = () => uni.switchTab({ url: '/pages/index/index' });

async function submit() {
  submitting.value = true;
  try {
    const base = { identityType: form.identityType, organization: form.organization.trim(), phone: form.phone, files: files.value.map((f) => f.key) };
    await api.certSubmit(
      isDoctor.value
        ? { ...base, realName: form.realName.trim(), province: form.province, city: form.city.trim(), department: form.department.trim() }
        : { ...base, position: form.position.trim() },
    );
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
  color: $price;
  background: #fff4f1;
}
.step {
  font-size: 28rpx;
  font-weight: 600;
  color: $brand-deep;
  margin-bottom: 20rpx;
}
.optional {
  margin-left: 12rpx;
  padding: 2rpx 12rpx;
  border-radius: 999rpx;
  background: $brand-light;
  color: $brand;
  font-size: 20rpx;
  font-weight: 500;
}
.identity {
  display: flex;
  gap: 20rpx;
}
.identity-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  padding: 26rpx 28rpx;
  border-radius: 20rpx;
  border: 2rpx solid $line;
  background: $brand-soft;
  &.active {
    border-color: $brand;
    background: linear-gradient(135deg, #eef4ff, #dce8ff);
    .identity-name {
      color: $brand;
    }
  }
}
.identity-name {
  font-size: 32rpx;
  font-weight: 600;
}
.identity-desc {
  font-size: 22rpx;
  color: $text-secondary;
}
.field {
  display: flex;
  align-items: center;
  min-height: 96rpx;
  border-bottom: 1rpx solid $line;
  &.last {
    border-bottom: none;
  }
}
.label {
  width: 120rpx;
  flex-shrink: 0;
  color: $text-secondary;
}
.input {
  flex: 1;
  height: 96rpx;
  line-height: 96rpx;
  font-size: 28rpx;
}
.pick.empty {
  color: #b5bccb;
}
.chev {
  color: $text-weak;
  font-size: 32rpx;
}
.files {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.file {
  width: 200rpx;
  height: 150rpx;
  border-radius: 16rpx;
  background: $brand-soft;
}
.add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2rpx dashed #c5d6f5;
  box-sizing: border-box;
}
.plus {
  font-size: 48rpx;
  line-height: 1;
  color: $brand;
}
.add-text {
  margin-top: 6rpx;
  font-size: 20rpx;
  color: $text-secondary;
}
.demo-tip {
  margin-top: 16rpx;
  color: $brand;
}
.tip {
  margin-top: 20rpx;
}
.actions {
  padding: 8rpx 28rpx 60rpx;
}
</style>
