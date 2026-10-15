<template>
  <CertGate>
    <scroll-view scroll-x class="tabs">
      <view :class="['tab', { active: !categoryId }]" @click="select()">全部</view>
      <view v-for="c in flatCategories" :key="c.id" :class="['tab', { active: categoryId === c.id }]" @click="select(c.id)">
        {{ c.name }}
      </view>
    </scroll-view>

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

const user = useUserStore();
const categories = ref<Category[]>([]);
const categoryId = ref<string>();
const list = ref<Card[]>([]);
const page = ref(1);
const loading = ref(false);
const finished = ref(false);

/** 一级分类 + 二级分类平铺为横向标签（WP02 设计确认后可改为左右联动） */
const flatCategories = computed(() => categories.value.flatMap((c) => [c, ...c.children]));

async function fetchPage(reset = false) {
  if (loading.value || (!reset && finished.value)) return;
  if (reset) {
    page.value = 1;
    finished.value = false;
  }
  loading.value = true;
  try {
    const res = await api.products({ page: page.value, pageSize: 20, categoryId: categoryId.value });
    list.value = reset ? res.list : [...list.value, ...res.list];
    finished.value = list.value.length >= res.total;
    page.value += 1;
  } finally {
    loading.value = false;
  }
}

function select(id?: string) {
  categoryId.value = id;
  fetchPage(true);
}

onShow(async () => {
  await user.ensureLogin();
  if (!user.certified) return;
  if (!categories.value.length) categories.value = await api.categories();
  if (!list.value.length) fetchPage(true);
});
onReachBottom(() => fetchPage());
</script>

<style lang="scss" scoped>
.tabs {
  white-space: nowrap;
  padding: 20rpx 24rpx 0;
}
.tab {
  display: inline-block;
  padding: 10rpx 28rpx;
  margin-right: 16rpx;
  border-radius: 999rpx;
  background: #fff;
  color: $text-secondary;
  &.active {
    background: $brand;
    color: #fff;
  }
}
.footer {
  text-align: center;
  padding: 24rpx 0 8rpx;
}
</style>
