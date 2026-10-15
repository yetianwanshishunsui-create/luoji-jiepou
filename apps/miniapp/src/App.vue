<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app';
import { useUserStore } from '@/stores/user';

onLaunch(() => {
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
