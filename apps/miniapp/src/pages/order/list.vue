<template>
  <view>
    <view v-for="o in list" :key="o.orderNo" class="card">
      <view class="head">
        <text class="muted">{{ o.orderNo }}</text>
        <text :class="['status', o.status]">{{ OrderStatusLabel[o.status as OrderStatus] }}</text>
      </view>
      <view v-for="(it, i) in o.items" :key="i" class="title">{{ it.title }}</view>
      <view class="foot">
        <text class="muted">{{ dateTime(o.createdAt) }}</text>
        <text class="price">¥{{ yuan(o.payCent) }}</text>
      </view>
      <view v-if="o.refundedCent" class="refunded">已退款 ¥{{ yuan(o.refundedCent) }}</view>
    </view>
    <view v-if="loaded && !list.length" class="muted empty">暂无订单</view>
  </view>
</template>

<script setup lang="ts">
import { OrderStatusLabel, type OrderStatus } from '@luoji/shared';
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app';
import { ref } from 'vue';
import { api } from '@/api';
import { yuan, dateTime } from '@/utils/format';

type Row = Awaited<ReturnType<typeof api.orders>>['list'][number];
const list = ref<Row[]>([]);
const loaded = ref(false);

async function load() {
  list.value = (await api.orders({ page: 1, pageSize: 50 })).list;
  loaded.value = true;
}

// 每次显示都刷新：支付、退款后返回本页时状态需要更新
// TODO(WP06)：待支付订单继续支付 / 取消、线下课报名与尾款
onShow(load);
onPullDownRefresh(() => load().finally(() => uni.stopPullDownRefresh()));
</script>

<style lang="scss" scoped>
.head,
.foot {
  display: flex;
  justify-content: space-between;
}
.title {
  margin: 20rpx 0;
  font-weight: 500;
}
.status {
  color: $text-secondary;
  &.PAID {
    color: $brand;
  }
  &.CREATED {
    color: #d4380d;
  }
}
.refunded {
  margin-top: 12rpx;
  text-align: right;
  font-size: 24rpx;
  color: $text-secondary;
}
.empty {
  text-align: center;
  padding: 120rpx 0;
}
</style>
