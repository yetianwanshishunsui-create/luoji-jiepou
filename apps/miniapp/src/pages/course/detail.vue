<template>
  <view v-if="product" class="page">
    <view class="hero-box">
      <image v-if="product.cover" :src="product.cover" mode="aspectFill" class="hero" />
    </view>

    <!-- 1. 课程名称 + 关键词 + 价格 -->
    <view class="card head">
      <view class="title">{{ product.title }}</view>
      <view v-if="product.keywords?.length" class="kws">
        <text v-for="k in product.keywords" :key="k" class="kw"># {{ k }}</text>
      </view>
      <view v-if="product.subtitle" class="muted sub">{{ product.subtitle }}</view>
      <view v-if="product.type === 'OFFLINE'" class="price-row">
        <text v-if="product.minDepositCent != null" class="price big">定金 {{ money(product.minDepositCent, product.pricePrefix) }} 起</text>
        <text class="offline-tag">线下课</text>
      </view>
      <view v-else class="price-row">
        <text v-if="product.pricingMode === 'FREE'" class="free">免费</text>
        <template v-else>
          <text class="price big">{{ money(product.currentPriceCent, product.pricePrefix) }}</text>
          <text v-if="product.currentPriceCent < product.priceCent" class="origin">{{ money(product.priceCent, product.pricePrefix) }}</text>
        </template>
        <text v-if="product.owned && product.pricingMode !== 'FREE'" class="owned">已购买</text>
      </view>
      <view v-if="product.priceRule && countdown && !product.owned" class="rule">
        <text class="rule-tag">{{ product.priceRule.type === 'EARLY_BIRD' ? '早鸟价' : '限时价' }}</text>
        <text>距结束 {{ countdown }}</text>
      </view>
    </view>

    <!-- 2. 场次选择（线下课）/ 课程目录（线上课） -->
    <view id="sessions">
      <OfflineSessions v-if="product.type === 'OFFLINE'" :product-id="product.id" :refresh-key="showCount">
        <template #left>
          <view :class="['bar-fav', { on: product.favorited }]" @click="toggleFavorite">
            <text class="fav-icon">{{ product.favorited ? '★' : '☆' }}</text>
            <text>{{ product.favorited ? '已收藏' : '收藏' }}</text>
          </view>
        </template>
      </OfflineSessions>
    </view>

    <view v-if="product.items.length" class="card">
      <view class="sec-head"><view><text class="sec-title">包含课程</text></view></view>
      <view v-for="it in product.items" :key="it.id" class="row item-row" @click="openProduct(it.id)">
        <text class="item-title">{{ it.title }}</text>
        <text class="muted">›</text>
      </view>
    </view>

    <view v-if="product.chapters.length" class="card">
      <view class="sec-head"><view><text class="sec-title">课程目录</text></view></view>
      <view v-for="ch in product.chapters" :key="ch.id">
        <view class="chapter">{{ ch.title }}</view>
        <view v-for="l in ch.lessons" :key="l.id" class="row lesson" @click="play(l)">
          <text class="type">{{ typeLabel[l.type] }}</text>
          <text class="lesson-title">{{ l.title }}</text>
          <text v-if="!product.owned && l.isTrial" class="trial">{{ l.trialSeconds ? '试看' : '免费' }}</text>
          <text v-else-if="!product.owned" class="lock">未解锁</text>
          <text v-else-if="l.duration" class="muted">{{ duration(l.duration) }}</text>
        </view>
      </view>
    </view>

    <!-- 3. 课程详情 -->
    <view v-if="product.detailHtml" class="card">
      <view class="sec-head"><view><text class="sec-title">课程详情</text></view></view>
      <rich-text :nodes="product.detailHtml" />
    </view>

    <!-- 引导添加课程顾问微信（全页只放这一处） -->
    <ConsultCard />

    <!-- 4. 学员评价：免费课程不开放评价 -->
    <ReviewSection v-if="product.pricingMode !== 'FREE'" :product-id="product.id" :refresh-key="showCount" />

    <!-- 底部操作栏：左侧收藏，右侧购买 / 学习（线下课的报名栏在场次组件里） -->
    <view v-if="product.type !== 'OFFLINE'" class="bar">
      <view :class="['bar-fav', { on: product.favorited }]" @click="toggleFavorite">
        <text class="fav-icon">{{ product.favorited ? '★' : '☆' }}</text>
        <text>{{ product.favorited ? '已收藏' : '收藏' }}</text>
      </view>
      <button v-if="!product.owned" class="btn-primary bar-btn" :loading="opening" @click="openCheckout">
        立即购买 {{ money(product.currentPriceCent, product.pricePrefix) }}
      </button>
      <button v-else class="btn-primary bar-btn" @click="startLearning">{{ product.pricingMode === 'FREE' ? '开始学习' : '继续学习' }}</button>
    </view>

    <!-- 结算面板 -->
    <view v-if="checkout" class="mask" @click="checkout = null" />
    <view v-if="checkout" class="sheet">
      <view class="sheet-title">确认订单</view>
      <view class="line">
        <text>{{ checkout.title }}</text>
      </view>
      <view class="line">
        <text class="muted">课程价格</text>
        <text>{{ money(checkout.originCent, checkout.pricePrefix) }}</text>
      </view>
      <view v-if="checkout.priceRule" class="line">
        <text class="muted">{{ checkout.priceRule.type === 'EARLY_BIRD' ? '早鸟优惠' : '限时优惠' }}</text>
        <text class="minus">-¥{{ yuan(checkout.originCent - checkout.totalCent) }}</text>
      </view>
      <view class="line" @click="pickingCoupon = !pickingCoupon">
        <text class="muted">优惠券</text>
        <text v-if="selectedCoupon" class="minus">-¥{{ yuan(selectedCoupon.discountCent) }} ›</text>
        <text v-else class="muted">{{ usableCount ? `${usableCount} 张可用 ›` : '暂无可用 ›' }}</text>
      </view>

      <scroll-view v-if="pickingCoupon" scroll-y class="coupon-list">
        <view :class="['coupon-opt', { active: !selectedId }]" @click="selectedId = null">不使用优惠券</view>
        <view
          v-for="c in checkout.coupons"
          :key="c.userCouponId"
          :class="['coupon-opt', { active: selectedId === c.userCouponId, disabled: !!c.reason }]"
          @click="!c.reason && (selectedId = c.userCouponId)"
        >
          <view>
            <text class="opt-name">{{ c.name }}</text>
            <text class="muted"> · {{ couponCondition(c) }}</text>
          </view>
          <text v-if="c.reason" class="muted">{{ c.reason }}</text>
          <text v-else class="minus">-¥{{ yuan(c.discountCent) }}</text>
        </view>
      </scroll-view>

      <view class="pay-row">
        <view>
          <text class="muted">实付 </text>
          <text class="price big">{{ money(payCent, checkout.pricePrefix) }}</text>
        </view>
        <button class="btn-primary pay-btn" :loading="buying" @click="buy">去支付</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onLoad, onShow } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';
import { api, type CheckoutPreview, type LessonBrief, type ProductDetail } from '@/api';
import ConsultCard from '@/components/ConsultCard.vue';
import OfflineSessions from '@/components/OfflineSessions.vue';
import ReviewSection from '@/components/ReviewSection.vue';
import { useCountdown } from '@/utils/countdown';
import { payOrder } from '@/utils/pay';
import { couponCondition, duration, money, yuan } from '@/utils/format';

const typeLabel = { VIDEO: '视频', AUDIO: '音频', ARTICLE: '图文' } as const;
const product = ref<ProductDetail>();
const buying = ref(false);
const opening = ref(false);
let id = '';

const countdown = useCountdown(computed(() => product.value?.priceRule?.endAt));

// ───────── 结算 ─────────
const checkout = ref<CheckoutPreview | null>(null);
const selectedId = ref<string | null>(null);
const pickingCoupon = ref(false);
const selectedCoupon = computed(() => checkout.value?.coupons.find((c) => c.userCouponId === selectedId.value) ?? null);
const usableCount = computed(() => checkout.value?.coupons.filter((c) => !c.reason).length ?? 0);
const payCent = computed(() => (checkout.value ? checkout.value.totalCent - (selectedCoupon.value?.discountCent ?? 0) : 0));

async function openCheckout() {
  opening.value = true;
  try {
    checkout.value = await api.checkoutPreview(id);
    // 默认选中优惠最多的券
    selectedId.value = checkout.value.bestUserCouponId;
    pickingCoupon.value = false;
  } finally {
    opening.value = false;
  }
}

async function load() {
  product.value = await api.product(id);
  uni.setNavigationBarTitle({ title: product.value.title });
}

function play(l: LessonBrief) {
  if (!product.value?.owned && !l.isTrial) {
    uni.showToast({ title: '购买后即可学习', icon: 'none' });
    return;
  }
  uni.navigateTo({ url: `/pages/course/play?lessonId=${l.id}&productId=${id}` });
}

const openProduct = (pid: string) => uni.navigateTo({ url: `/pages/course/detail?id=${pid}` });

const favoriting = ref(false);
async function toggleFavorite() {
  if (!product.value || favoriting.value) return;
  favoriting.value = true;
  try {
    const { favorited } = await api.setFavorite(id, !product.value.favorited);
    product.value.favorited = favorited;
    uni.showToast({ title: favorited ? '已收藏' : '已取消收藏', icon: 'none' });
  } finally {
    favoriting.value = false;
  }
}

/** 已购 / 免费：进入第一个课时；专栏、系列没有课时时滚到包含课程 */
function startLearning() {
  const first = product.value?.chapters.flatMap((c) => c.lessons)[0];
  if (first) play(first);
  else uni.pageScrollTo({ selector: '#sessions', duration: 300 });
}

/**
 * 下单 → 获取支付参数 → wx.requestPayment。
 * 支付接口在商户号开通后接入（WP06）；iOS 虚拟支付策略待平台规则确认（技术方案第 9 节）。
 */
async function buy() {
  buying.value = true;
  try {
    const order = await api.createOrder({ productId: id, userCouponId: selectedId.value ?? undefined });
    checkout.value = null;
    if (await payOrder(order.orderNo, order.payCent)) {
      uni.showToast({ title: '购买成功', icon: 'success' });
      await load();
    } else {
      // 用户取消 / 支付失败：立即取消订单释放优惠券，不必等 30 分钟超时关单
      api.cancelOrder(order.orderNo).catch(() => undefined);
    }
  } catch {
    /* 下单失败的提示已在 request 中处理 */
  } finally {
    buying.value = false;
  }
}

onLoad((q) => {
  id = String(q?.id ?? '');
});
// 从领券中心等页面返回时刷新价格和购买状态
const showCount = ref(0);
onShow(() => {
  showCount.value += 1;
  if (id) load();
});
</script>

<style lang="scss" scoped>
.page {
  padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
}
.hero-box {
  padding: 20rpx 28rpx 0;
}
.hero {
  display: block;
  width: 100%;
  height: 462rpx;
  border-radius: $radius;
  box-shadow: 0 16rpx 40rpx rgba(20, 48, 111, 0.14);
}
.head {
  margin-top: -40rpx;
  position: relative;
  margin-left: 44rpx;
  margin-right: 44rpx;
}
.title {
  font-size: 36rpx;
  font-weight: 600;
  line-height: 1.45;
}
.kws {
  margin-top: 18rpx;
  margin-bottom: -12rpx;
}
.sub {
  margin-top: 12rpx;
}
.price-row {
  margin-top: 20rpx;
  display: flex;
  align-items: baseline;
  gap: 16rpx;
}
.big {
  font-size: 40rpx;
}
.offline-tag {
  padding: 2rpx 14rpx;
  border-radius: 999rpx;
  background: $brand-light;
  color: $brand;
  font-size: 22rpx;
}
.item-row {
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
}
.item-title {
  flex: 1;
}
.lock {
  font-size: 22rpx;
  color: $text-weak;
}
.rule {
  margin-top: 16rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 24rpx;
  color: $price;
}
.rule-tag {
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
  background: $price;
  color: #fff;
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
  margin-bottom: 16rpx;
}
.line {
  display: flex;
  justify-content: space-between;
  padding: 20rpx 0;
  border-bottom: 1rpx solid $line;
}
.minus {
  color: $price;
}
.coupon-list {
  max-height: 420rpx;
}
.coupon-opt {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 24rpx;
  margin-top: 12rpx;
  border-radius: 12rpx;
  border: 2rpx solid #eef1ef;
  &.active {
    border-color: $brand;
    background: $brand-light;
  }
  &.disabled {
    opacity: 0.5;
  }
}
.opt-name {
  font-weight: 500;
}
.pay-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 28rpx;
}
.pay-btn {
  width: 280rpx;
  margin: 0;
}
.free,
.owned {
  color: $brand;
  font-weight: 600;
}
.origin {
  color: $text-secondary;
  text-decoration: line-through;
  font-size: 24rpx;
}
.chapter {
  margin-top: 20rpx;
  font-weight: 600;
  color: $brand-deep;
}
.row {
  padding: 22rpx 0;
  border-bottom: 1rpx solid $line;
}
.lesson {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.type {
  font-size: 22rpx;
  color: $brand;
  background: $brand-light;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
}
.lesson-title {
  flex: 1;
}
.trial {
  color: $brand;
  font-size: 24rpx;
}
.bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 28rpx;
  padding: 18rpx 32rpx calc(18rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 -6rpx 24rpx rgba(20, 48, 111, 0.06);
}
.bar-fav {
  min-width: 72rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 20rpx;
  color: $text-secondary;
  &.on {
    color: #e08a1e;
  }
}
.fav-icon {
  font-size: 40rpx;
  line-height: 1.1;
}
.bar-btn {
  flex: 1;
  margin: 0;
}
</style>
