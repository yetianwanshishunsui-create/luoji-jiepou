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
page {
  background: $bg;
  color: $text;
  font-size: 28rpx;
}
.card {
  background: #fff;
  border-radius: $radius;
  padding: 28rpx;
  margin: 24rpx;
}
.btn-primary {
  background: $brand !important;
  color: #fff !important;
  border-radius: 999rpx !important;
}
.muted {
  color: $text-secondary;
  font-size: 24rpx;
}
.price {
  color: #d4380d;
  font-weight: 600;
}
</style>
