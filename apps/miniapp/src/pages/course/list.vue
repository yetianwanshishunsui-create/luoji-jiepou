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

    <view class="card">
      <ProductCard v-for="p in list" :key="p.id" :product="p" />
      <view class="muted footer">{{ loading ? '加载中…' : finished ? (list.length ? '没有更多了' : '暂无课程') : '' }}</view>
    </view>
  </CertGate>
</template>

<script setup lang="ts">
import { onReachBottom, onShow } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';
import { api, type Category, type ProductCard as Card } from '@/api';
import CertGate from '@/components/CertGate.vue';
import ProductCard from '@/components/ProductCard.vue';
import { useUserStore } from '@/stores/user';
import { takeCourseCategory } from '@/utils/nav';

const user = useUserStore();
const categories = ref<Category[]>([]);
const rootId = ref<string>();
const childId = ref<string>();
const list = ref<Card[]>([]);
const page = ref(1);
const loading = ref(false);
const finished = ref(false);

const children = computed(() => categories.value.find((c) => c.id === rootId.value)?.children ?? []);

async function fetchPage(reset = false) {
  if (loading.value || (!reset && finished.value)) return;
  if (reset) {
    page.value = 1;
    finished.value = false;
  }
  loading.value = true;
  try {
    const res = await api.products({ page: page.value, pageSize: 20, categoryId: childId.value ?? rootId.value });
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

/** 首页分类入口跳转过来时，定位到对应的一级 / 二级分类 */
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
  const preset = takeCourseCategory();
  if (preset && applyPreset(preset)) fetchPage(true);
  else if (!list.value.length) fetchPage(true);
});
onReachBottom(() => fetchPage());
</script>

<style lang="scss" scoped>
.nav {
  background: #fff;
  padding-bottom: 8rpx;
}
.tabs,
.chips {
  white-space: nowrap;
  padding: 0 24rpx;
}
.tab {
  display: inline-block;
  padding: 24rpx 4rpx 16rpx;
  margin-right: 40rpx;
  font-size: 30rpx;
  color: $text-secondary;
  border-bottom: 6rpx solid transparent;
  &.active {
    color: $text;
    font-weight: 600;
    border-bottom-color: $brand;
  }
}
.chips {
  padding-top: 16rpx;
  padding-bottom: 8rpx;
}
.chip {
  display: inline-block;
  padding: 8rpx 24rpx;
  margin-right: 16rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  background: $bg;
  color: $text-secondary;
  &.active {
    background: $brand-light;
    color: $brand;
    font-weight: 500;
  }
}
.footer {
  text-align: center;
  padding: 24rpx 0 8rpx;
}
</style>
