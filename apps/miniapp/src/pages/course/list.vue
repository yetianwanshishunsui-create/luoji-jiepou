<template>
  <CertGate>
    <!-- 一级：线下精品课 / 线上精品课 / 公益讲堂；二级：系列与专区 -->
    <view class="nav">
      <scroll-view scroll-x class="tabs">
        <view :class="['tab', { active: !rootId }]" @click="selectRoot()">全部</view>
        <view v-for="c in categories" :key="c.id" :class="['tab', { active: rootId === c.id }]" @click="selectRoot(c.id)">
          {{ c.name }}
        </view>
      </scroll-view>
      <scroll-view v-if="children.length" scroll-x class="chips">
        <view :class="['chip', { active: !childId }]" @click="selectChild()">全部</view>
        <view v-for="c in children" :key="c.id" :class="['chip', { active: childId === c.id }]" @click="selectChild(c.id)">
          {{ c.name }}
        </view>
      </scroll-view>
    </view>

    <!-- 线下精品课：多一个「线下会议日程」入口 -->
    <view v-if="isOffline" class="card schedule" @click="goSchedule">
      <view>
        <view class="schedule-title">线下会议日程</view>
        <view class="muted">查看课程安排与日程，加入我的学习计划</view>
      </view>
      <text class="schedule-go">查看日程 →</text>
    </view>

    <view v-if="bodyPart" class="part-filter">
      <text>部位：{{ BodyPartLabel[bodyPart] }}</text>
      <text class="part-clear" @click="clearPart">清除 ✕</text>
    </view>

    <view class="card">
      <ProductCard v-for="p in list" :key="p.id" :product="p" />
      <view class="muted footer">{{ loading ? '加载中…' : finished ? (list.length ? '没有更多了' : '暂无课程') : '' }}</view>
    </view>
  </CertGate>
</template>

<script setup lang="ts">
import { onReachBottom, onShow } from '@dcloudio/uni-app';
import { BodyPartLabel, type BodyPart } from '@luoji/shared';
import { computed, ref } from 'vue';
import { api, type Category, type ProductCard as Card } from '@/api';
import CertGate from '@/components/CertGate.vue';
import ProductCard from '@/components/ProductCard.vue';
import { useUserStore } from '@/stores/user';
import { takeCourseFilter } from '@/utils/nav';

const user = useUserStore();
const categories = ref<Category[]>([]);
const rootId = ref<string>();
const childId = ref<string>();
const bodyPart = ref<BodyPart>();
const list = ref<Card[]>([]);
const page = ref(1);
const loading = ref(false);
const finished = ref(false);

const children = computed(() => categories.value.find((c) => c.id === rootId.value)?.children ?? []);
const isOffline = computed(() => !!categories.value.find((c) => c.id === rootId.value)?.name.includes('线下'));

async function fetchPage(reset = false) {
  if (loading.value || (!reset && finished.value)) return;
  if (reset) {
    page.value = 1;
    finished.value = false;
  }
  loading.value = true;
  try {
    const res = await api.products({ page: page.value, pageSize: 20, categoryId: childId.value ?? rootId.value, bodyPart: bodyPart.value });
    list.value = reset ? res.list : [...list.value, ...res.list];
    finished.value = list.value.length >= res.total;
    page.value += 1;
  } finally {
    loading.value = false;
  }
}

function selectRoot(id?: string) {
  rootId.value = id;
  childId.value = undefined;
  fetchPage(true);
}

function selectChild(id?: string) {
  childId.value = id;
  fetchPage(true);
}

function clearPart() {
  bodyPart.value = undefined;
  fetchPage(true);
}

const goSchedule = () => uni.navigateTo({ url: '/pages/schedule/index' });

/** 首页分类 / 部位入口跳转过来时，定位到对应的分类或部位 */
function applyPreset(id: string) {
  const root = categories.value.find((c) => c.id === id || c.children.some((x) => x.id === id));
  if (!root) return false;
  rootId.value = root.id;
  childId.value = root.id === id ? undefined : id;
  return true;
}

onShow(async () => {
  await user.ensureLogin();
  if (!user.certified) return;
  if (!categories.value.length) categories.value = await api.categories();
  const preset = takeCourseFilter();
  if (preset?.bodyPart) {
    // 从「按部位找课」进入：只按部位筛选
    bodyPart.value = preset.bodyPart;
    rootId.value = undefined;
    childId.value = undefined;
    fetchPage(true);
  } else if (preset?.categoryId && applyPreset(preset.categoryId)) {
    bodyPart.value = undefined;
    fetchPage(true);
  } else if (!list.value.length) fetchPage(true);
});
onReachBottom(() => fetchPage());
</script>

<style lang="scss" scoped>
.nav {
  padding-bottom: 8rpx;
}
.tabs,
.chips {
  white-space: nowrap;
  padding: 0 28rpx;
}
.tab {
  display: inline-block;
  position: relative;
  padding: 24rpx 4rpx 18rpx;
  margin-right: 44rpx;
  font-size: 30rpx;
  color: $text-secondary;
  &.active {
    color: $text;
    font-weight: 600;
    &::after {
      content: '';
      position: absolute;
      left: 50%;
      bottom: 6rpx;
      width: 36rpx;
      height: 8rpx;
      margin-left: -18rpx;
      border-radius: 8rpx;
      background: $brand-grad;
    }
  }
}
.chips {
  padding-top: 12rpx;
  padding-bottom: 8rpx;
}
.chip {
  display: inline-block;
  padding: 10rpx 26rpx;
  margin-right: 16rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  background: rgba(255, 255, 255, 0.8);
  color: $text-secondary;
  &.active {
    background: $brand;
    color: #fff;
    font-weight: 500;
  }
}
.schedule {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(110deg, #ffffff 30%, #e6efff);
}
.schedule-title {
  font-size: 30rpx;
  font-weight: 600;
  margin-bottom: 4rpx;
}
.schedule-go {
  flex-shrink: 0;
  font-size: 24rpx;
  color: $brand;
  font-weight: 500;
}
.part-filter {
  display: flex;
  justify-content: space-between;
  margin: 16rpx 28rpx 0;
  padding: 16rpx 24rpx;
  border-radius: 16rpx;
  background: $brand-light;
  color: $brand-deep;
  font-size: 26rpx;
}
.part-clear {
  color: $text-secondary;
  font-size: 24rpx;
}
.footer {
  text-align: center;
  padding: 24rpx 0 8rpx;
}
</style>
