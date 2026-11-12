<template>
  <CertGate>
    <!-- 顶部：品牌故事与创始人 -->
    <view class="brand" @click="goAbout">
      <view class="brand-rings" />
      <view class="brand-text">
        <image class="brand-mark" src="/static/brand/wordmark.png" mode="heightFix" aria-label="逻辑解剖" />
        <view class="brand-slogan">以解剖立学 · 以临床立教</view>
        <view class="founder-line">
          <text class="founder-name">{{ founder.name }}</text>
          <text class="founder-title">{{ founder.title }}</text>
        </view>
        <view class="brand-go">品牌故事与创始人 ›</view>
      </view>
      <image v-if="founder.photo" class="founder-photo" :src="founder.photo" mode="aspectFill" />
      <view v-else class="founder-photo monogram">{{ founder.name.slice(0, 1) }}</view>
    </view>

    <!-- 课程体系：杂志目录式 -->
    <view class="card toc">
      <view class="sec-head"><text class="sec-title">课程体系</text></view>
      <view v-for="(r, i) in ROOTS" :key="r.word" class="toc-row" @click="openRoot(r.word)">
        <text class="toc-no">0{{ i + 1 }}</text>
        <view class="toc-text">
          <text class="toc-name">{{ r.name }}</text>
          <text class="toc-sub">{{ r.sub }}</text>
        </view>
        <text class="toc-arrow">→</text>
      </view>
      <view class="toc-links">
        <view v-for="l in LINKS" :key="l.name" class="toc-link" @click="go(l.url)">
          <image :src="staticUrl(`/static/icons/${l.icon}.png`)" class="toc-link-icon" mode="aspectFit" />
          <text>{{ l.name }}</text>
        </view>
      </view>
    </view>

    <!-- 精选：横向滑动卡片（后台 Banner） -->
    <view v-if="banners.length" class="featured">
      <view class="sec-head pad"><text class="sec-title">精选</text></view>
      <scroll-view scroll-x class="featured-row" :show-scrollbar="false">
        <view v-for="b in banners" :key="b.id" class="feature" @click="b.link && openLink(b.link)">
          <image :src="b.image" :aria-label="b.title" mode="aspectFill" class="feature-img" />
          <view class="feature-title">{{ b.title }}</view>
        </view>
      </scroll-view>
    </view>

    <!-- 合作入口：仅从业者身份显示 -->
    <view v-if="user.profile?.identityType === 'PRACTITIONER'" class="card join" @click="goJoin">
      <view>
        <view class="join-title">合作招募</view>
        <view class="join-sub">品牌协作 · 渠道与区域合伙 · 机构团课</view>
      </view>
      <text class="join-go">了解合作 →</text>
    </view>

    <!-- 推荐栏目：线下课按日程展示，其余为文字列表 -->
    <view v-for="sec in sections" :key="sec.title" class="card section">
      <view class="sec-head">
        <text class="sec-title">{{ sec.title }}</text>
        <text class="sec-more" @click="openMore(sec.title)">全部 →</text>
      </view>
      <ProductCard
        v-for="p in sec.products.slice(0, 4)"
        :key="p.id"
        :product="p"
        :layout="p.type === 'OFFLINE' ? 'event' : 'list'"
      />
    </view>
    <view v-if="loaded && !sections.length" class="card muted empty">暂无课程</view>

    <view class="footer">析毫剖芒 · 以解剖立学，以临床立教</view>
  </CertGate>
</template>

<script setup lang="ts">
import { DEFAULT_ABOUT_PAGE, isTabPage, type AboutPageConfig } from '@luoji/shared';
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app';
import { ref } from 'vue';
import { api, type Category, type ProductCard as Card } from '@/api';
import CertGate from '@/components/CertGate.vue';
import ProductCard from '@/components/ProductCard.vue';
import { useUserStore } from '@/stores/user';
import { openCourseCategory } from '@/utils/nav';
import { staticUrl } from '@/utils/static';

const ROOTS = [
  { word: '线下', name: '线下精品课', sub: '四大主题 · 标本实操与临床转化' },
  { word: '线上', name: '线上精品课', sub: '按部位系统学习 · 随时回看' },
  { word: '公益', name: '公益讲堂', sub: '每日 60 秒 · 云学苑' },
];
const LINKS = [
  { name: '会议日程', icon: 'schedule', url: '/pages/schedule/index' },
  { name: '领券中心', icon: 'gift', url: '/pages/coupon/center' },
  { name: '我的收藏', icon: 'favorite', url: '/pages/favorite/index' },
];

const user = useUserStore();
const banners = ref<{ id: string; title: string; image: string; link: string | null }[]>([]);
const sections = ref<{ title: string; products: Card[] }[]>([]);
const categories = ref<Category[]>([]);
const founder = ref<AboutPageConfig['founder']>(DEFAULT_ABOUT_PAGE.founder);
const loaded = ref(false);

/** 按一级分类名称找分类，后台改了排序也能对上 */
const openRoot = (word: string) => {
  const c = categories.value.find((x) => x.name.includes(word));
  return c ? openCourseCategory(c.id) : uni.switchTab({ url: '/pages/course/list' });
};

/** 栏目「全部」：线下 / 公益栏目进对应分类，其余进线上精品课 */
const openMore = (title: string) => openRoot(title.includes('线下') ? '线下' : title.includes('公益') ? '公益' : '线上');

async function load() {
  await user.ensureLogin();
  if (!user.certified) {
    await user.refreshProfile(); // 审核通过后返回首页即可刷新状态
    if (!user.certified) return;
  }
  const [res, cats, about] = await Promise.all([api.home(), api.categories(), api.aboutPage().catch(() => null)]);
  banners.value = res.banners;
  sections.value = res.sections;
  categories.value = cats;
  if (about) founder.value = about.founder;
  loaded.value = true;
}

/** 运营位链接：tabBar 页面只能 switchTab */
const openLink = (link: string) => (isTabPage(link) ? uni.switchTab({ url: link }) : uni.navigateTo({ url: link }));
const go = (url: string) => uni.navigateTo({ url });
const goJoin = () => go('/pages/join/index');
const goAbout = () => go('/pages/about/index');

onShow(() => load().catch(() => undefined));
onPullDownRefresh(() => load().finally(() => uni.stopPullDownRefresh()));
</script>

<style lang="scss" scoped>
.brand {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin: 20rpx 28rpx 0;
  padding: 32rpx 28rpx 32rpx 36rpx;
  border-radius: 28rpx;
  background: linear-gradient(135deg, #ffffff 0%, #eef4ff 55%, #dbe7ff 100%);
  box-shadow: 0 12rpx 36rpx rgba(20, 48, 111, 0.08);
}
.brand-rings {
  position: absolute;
  right: -90rpx;
  bottom: -150rpx;
  width: 360rpx;
  height: 360rpx;
  border-radius: 50%;
  border: 2rpx solid rgba(42, 91, 215, 0.12);
  box-shadow:
    0 0 0 40rpx rgba(255, 255, 255, 0.4),
    0 0 0 42rpx rgba(42, 91, 215, 0.08);
}
.brand-text {
  position: relative;
  flex: 1;
  min-width: 0;
}
.brand-mark {
  height: 52rpx;
  display: block;
}
.brand-slogan {
  margin-top: 10rpx;
  font-size: 22rpx;
  letter-spacing: 4rpx;
  color: #4a5d86;
}
.founder-line {
  margin-top: 26rpx;
  display: flex;
  align-items: baseline;
  gap: 12rpx;
}
.founder-name {
  font-size: 28rpx;
  font-weight: 600;
  color: $brand-deep;
}
.founder-title {
  font-size: 22rpx;
  color: $text-secondary;
}
.brand-go {
  display: inline-block;
  margin-top: 18rpx;
  padding: 6rpx 20rpx;
  border-radius: 999rpx;
  background: $brand-grad;
  color: #fff;
  font-size: 22rpx;
}
.founder-photo {
  position: relative;
  width: 168rpx;
  height: 224rpx;
  border-radius: 20rpx;
  flex-shrink: 0;
  background: #fff;
  border: 4rpx solid #fff;
  box-shadow: 0 10rpx 24rpx rgba(20, 48, 111, 0.14);
}
.monogram {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(160deg, #e6efff, #c9dbff);
  font-size: 72rpx;
  font-weight: 600;
  color: $brand;
}
.toc {
  padding-bottom: 8rpx;
}
.toc-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx 0;
  border-bottom: 1rpx solid $line;
}
.toc-no {
  width: 64rpx;
  font-family: 'Songti SC', 'STSong', 'Noto Serif SC', serif;
  font-size: 40rpx;
  font-weight: 700;
  color: #b9cdf3;
}
.toc-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.toc-name {
  font-size: 28rpx;
  font-weight: 600;
  color: $brand-deep;
}
.toc-sub {
  font-size: 22rpx;
  color: $text-secondary;
}
.toc-arrow {
  font-size: 28rpx;
  color: $brand;
}
.toc-links {
  display: flex;
  justify-content: space-between;
  padding: 22rpx 0 16rpx;
}
.toc-link {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 22rpx;
  color: $text-secondary;
}
.toc-link-icon {
  width: 36rpx;
  height: 36rpx;
}
.featured {
  margin-top: 8rpx;
}
.pad {
  padding: 0 28rpx;
}
.featured-row {
  white-space: nowrap;
  padding: 8rpx 0 4rpx 28rpx;
  box-sizing: border-box;
}
.feature {
  display: inline-block;
  width: 520rpx;
  margin-right: 20rpx;
  vertical-align: top;
  white-space: normal;
}
.feature-img {
  display: block;
  width: 520rpx;
  height: 222rpx;
  border-radius: 20rpx;
  background: $brand-light;
}
.feature-title {
  margin-top: 12rpx;
  font-size: 24rpx;
  font-weight: 500;
  color: $text;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.join {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.join-title {
  font-size: 26rpx;
  font-weight: 600;
  color: $brand-deep;
  margin-bottom: 4rpx;
}
.join-sub {
  font-size: 22rpx;
  color: $text-secondary;
}
.join-go {
  font-size: 22rpx;
  color: $brand;
}
.section {
  padding-top: 28rpx;
  padding-bottom: 8rpx;
}
.empty {
  padding: 40rpx 0;
  text-align: center;
}
.footer {
  padding: 16rpx 0 48rpx;
  text-align: center;
  font-size: 20rpx;
  letter-spacing: 4rpx;
  color: $text-weak;
}
</style>
