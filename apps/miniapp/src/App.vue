<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app';
import { useUserStore } from '@/stores/user';

onLaunch(() => {
  if (import.meta.env.VITE_DEMO === 'true' && !uni.getStorageSync('luoji_demo_welcomed')) {
    try {
      uni.setStorageSync('luoji_demo_welcomed', 1);
    } catch {
      /* 本地存储不可用时每次都提示 */
    }
    uni.showModal({
      title: '逻辑解剖 · 演示版',
      content: '课程、价格、优惠券等均为拟定的演示内容，支付为模拟支付。数据只保存在本机，可在「我的 → 演示工具」切换身份或重新开始。',
      showCancel: false,
      confirmText: '开始体验',
    });
  }
  // 静默登录：拿到 openid 和认证状态，页面再按状态决定是否引导认证
  useUserStore().ensureLogin().catch(() => undefined);
});
</script>

<style lang="scss">
/* 页面顶部淡蓝渐变，向下过渡到浅灰蓝底色，和导航栏颜色衔接 */
page {
  background: linear-gradient(180deg, #e3edff 0, #eef4ff 320rpx, $bg 640rpx) no-repeat, $bg;
  color: $text;
  font-size: 28rpx;
  font-family: -apple-system, 'PingFang SC', 'Helvetica Neue', 'Microsoft YaHei', sans-serif;
  line-height: 1.5;
}
.card {
  background: #fff;
  border-radius: $radius;
  padding: 32rpx;
  margin: 24rpx 28rpx;
  box-shadow: $shadow;
}
/* 区块标题：中文标题 + 英文小字，右侧可放「更多」 */
.sec-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 12rpx;
}
/* 区块标题：左侧渐变竖条 + 标题 */
.sec-title {
  position: relative;
  padding-left: 22rpx;
  font-size: 34rpx;
  font-weight: 600;
  letter-spacing: 1rpx;
  color: $brand-deep;
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    width: 8rpx;
    height: 32rpx;
    margin-top: -16rpx;
    border-radius: 8rpx;
    background: linear-gradient(180deg, #6d9cff, $brand);
  }
}
.sec-more {
  font-size: 24rpx;
  color: $text-secondary;
}
.btn-primary {
  background: $brand-grad !important;
  color: #fff !important;
  border-radius: 999rpx !important;
  box-shadow: 0 10rpx 24rpx rgba(42, 91, 215, 0.24);
  font-weight: 500;
  &::after {
    border: none;
  }
  &[disabled] {
    opacity: 0.5;
  }
}
.btn-ghost {
  background: $brand-light !important;
  color: $brand !important;
  border-radius: 999rpx !important;
  font-weight: 500;
  &::after {
    border: none;
  }
}
.muted {
  color: $text-secondary;
  font-size: 24rpx;
}
.price {
  color: $price;
  font-weight: 600;
}
/* 关键词标签 */
.kw {
  display: inline-block;
  margin: 0 12rpx 12rpx 0;
  padding: 4rpx 18rpx;
  border-radius: 999rpx;
  background: $brand-light;
  color: $brand;
  font-size: 22rpx;
  line-height: 1.6;
}
</style>
