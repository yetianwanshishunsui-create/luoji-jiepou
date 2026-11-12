<template>
  <CertGate>
    <!-- 左侧分类栏 + 右侧列表 -->
    <view class="layout">
      <scroll-view scroll-y class="rail">
        <view :class="['rail-item', { active: !rootId }]" @click="selectRoot()">全部课程</view>
        <view v-for="c in categories" :key="c.id" :class="['rail-item', { active: rootId === c.id }]" @click="selectRoot(c.id)">
          {{ c.name }}
        </view>
      </scroll-view>

      <scroll-view scroll-y class="pane" :scroll-top="paneTop" @scrolltolower="fetchPage()">
        <view class="pane-head">
          <text class="pane-title">{{ rootName || '全部课程' }}</text>
          <text v-if="loaded" class="pane-count">{{ total }} 门</text>
        </view>

        <!-- 线下精品课：线下会议日程入口 -->
        <view v-if="isOffline" class="schedule" @click="goSchedule">
          <image :src="staticUrl('/static/icons/schedule.png')" class="schedule-icon" mode="aspectFit" />
          <text class="schedule-text">线下会议日程 · 查看课程安排</text>
          <text class="schedule-go">→</text>
        </view>

        <!-- 线上精品课只按部位分类；其他分类显示二级分类 -->
        <view v-if="isOnline" class="parts">
          <view :class="['part', { active: !bodyPart }]" @click="selectPart()">
            <view class="part-icon all">全</view>
            <text class="part-name">全部</text>
          </view>
          <view v-for="p in PARTS" :key="p" :class="['part', { active: bodyPart === p }]" @click="selectPart(p)">
            <view class="part-icon"><image :src="staticUrl(`/static/parts/${p.toLowerCase()}.png`)" mode="aspectFit" class="part-img" /></view>
            <text class="part-name">{{ BodyPartLabel[p] }}</text>
          </view>
        </view>
        <view v-else-if="children.length" class="chips">
          <text :class="['chip', { active: !childId }]" @click="selectChild()">全部</text>
          <text v-for="c in children" :key="c.id" :class="['chip', { active: childId === c.id }]" @click="selectChild(c.id)">{{ c.name }}</text>
        </view>

        <view class="list">
          <ProductCard v-for="p in list" :key="p.id" :product="p" :layout="p.type === 'OFFLINE' ? 'event' : 'list'" />
        </view>
        <view class="muted footer">{{ loading ? '加载中…' : finished ? (list.length ? '没有更多了' : '暂无课程') : '' }}</view>
      </scroll-view>
    </view>
  </CertGate>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { BodyPart, BodyPartLabel } from '@luoji/shared';
import { computed, ref } from 'vue';
import { api, type Category, type ProductCard as Card } from '@/api';
import CertGate from '@/components/CertGate.vue';
import ProductCard from '@/components/ProductCard.vue';
import { useUserStore } from '@/stores/user';
import { takeCourseFilter } from '@/utils/nav';
import { staticUrl } from '@/utils/static';

const user = useUserStore();
const categories = ref<Category[]>([]);
const rootId = ref<string>();
const childId = ref<string>();
const PARTS = Object.values(BodyPart);
const bodyPart = ref<BodyPart>();
const list = ref<Card[]>([]);
const page = ref(1);
const loading = ref(false);
const finished = ref(false);
const loaded = ref(false);
const total = ref(0);
/** 切换分类时右侧列表回到顶部（值变化才会触发滚动，所以在两个相近值之间切换） */
const paneTop = ref(0);

const children = computed(() => categories.value.find((c) => c.id === rootId.value)?.children ?? []);
const rootName = computed(() => categories.value.find((c) => c.id === rootId.value)?.name ?? '');
const isOffline = computed(() => rootName.value.includes('线下'));
const isOnline = computed(() => rootName.value.includes('线上'));

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
    total.value = res.total;
    finished.value = list.value.length >= res.total;
    loaded.value = true;
    if (reset) paneTop.value = paneTop.value ? 0 : 0.01;
    page.value += 1;
  } finally {
    loading.value = false;
  }
}

function selectRoot(id?: string) {
  rootId.value = id;
  childId.value = undefined;
  bodyPart.value = undefined;
  fetchPage(true);
}

function selectChild(id?: string) {
  childId.value = id;
  fetchPage(true);
}

function selectPart(part?: BodyPart) {
  bodyPart.value = part;
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
  if (preset?.categoryId && applyPreset(preset.categoryId)) {
    bodyPart.value = undefined;
    fetchPage(true);
  } else if (!list.value.length) fetchPage(true);
});
</script>

<style lang="scss" scoped>
/* 页面高度减去导航栏和底部 Tab（H5 下由 uni 提供这两个变量，小程序中为 0） */
.layout {
  display: flex;
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  background: #fff;
}
.rail {
  width: 188rpx;
  flex-shrink: 0;
  height: 100%;
  background: $bg;
}
.rail-item {
  position: relative;
  padding: 34rpx 20rpx 34rpx 28rpx;
  font-size: 24rpx;
  color: $text-secondary;
  line-height: 1.4;
  &.active {
    background: #fff;
    color: $brand-deep;
    font-weight: 600;
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 30rpx;
      bottom: 30rpx;
      width: 6rpx;
      border-radius: 0 6rpx 6rpx 0;
      background: $brand;
    }
  }
}
.pane {
  flex: 1;
  height: 100%;
  min-width: 0;
}
.pane-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 28rpx 28rpx 12rpx;
}
.pane-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $brand-deep;
}
.pane-count {
  font-size: 22rpx;
  color: $text-weak;
}
.schedule {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin: 8rpx 28rpx 4rpx;
  padding: 18rpx 20rpx;
  border-radius: 16rpx;
  background: $brand-soft;
}
.schedule-icon {
  width: 36rpx;
  height: 36rpx;
}
.schedule-text {
  flex: 1;
  font-size: 24rpx;
  color: $brand-deep;
}
.schedule-go {
  color: $brand;
}
.parts {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  row-gap: 18rpx;
  margin: 8rpx 20rpx 0;
  padding: 20rpx 0 22rpx;
  border-bottom: 1rpx solid $line;
}
.part {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}
.part-icon {
  width: 76rpx;
  height: 76rpx;
  border-radius: 22rpx;
  background: $brand-soft;
  border: 2rpx solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  &.all {
    font-size: 26rpx;
    font-weight: 600;
    color: $brand;
  }
}
.part-img {
  width: 56rpx;
  height: 56rpx;
}
.part-name {
  font-size: 20rpx;
  color: $text-secondary;
}
.part.active {
  .part-icon {
    border-color: $brand;
    background: $brand-light;
  }
  .part-name {
    color: $brand;
    font-weight: 600;
  }
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
  padding: 8rpx 28rpx 18rpx;
  border-bottom: 1rpx solid $line;
}
.chip {
  padding: 8rpx 20rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
  background: $bg;
  color: $text-secondary;
  &.active {
    background: $brand-light;
    color: $brand;
    font-weight: 500;
  }
}
.list {
  padding: 0 28rpx;
}
.footer {
  text-align: center;
  padding: 24rpx 0 40rpx;
}
</style>
