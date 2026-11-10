<template>
  <CertGate>
    <view class="seg">
      <view :class="['seg-item', { on: tab === 'all' }]" @click="switchTab('all')">平台排期</view>
      <view :class="['seg-item', { on: tab === 'mine' }]" @click="switchTab('mine')">我的计划</view>
    </view>

    <!-- 日历：周 / 月 -->
    <view class="card cal">
      <view class="cal-head">
        <text class="cal-nav" @click="shift(-1)">‹</text>
        <text class="cal-month">{{ cursor.getFullYear() }} 年 {{ cursor.getMonth() + 1 }} 月</text>
        <text class="cal-nav" @click="shift(1)">›</text>
        <view class="mode">
          <text :class="['mode-item', { on: mode === 'week' }]" @click="setMode('week')">周</text>
          <text :class="['mode-item', { on: mode === 'month' }]" @click="setMode('month')">月</text>
        </view>
      </view>
      <view class="week-names">
        <text v-for="w in WEEK" :key="w" class="week-name">{{ w }}</text>
      </view>
      <view class="days">
        <view
          v-for="d in days"
          :key="d.key"
          :class="['day', { other: !d.inMonth && mode === 'month', today: d.key === todayKey, picked: d.key === pickedKey }]"
          @click="pick(d.date)"
        >
          <text class="day-num">{{ d.date.getDate() }}</text>
          <view class="day-dots">
            <view v-if="d.has" class="dot" />
            <view v-if="d.mine" class="dot mine" />
          </view>
        </view>
      </view>
      <view class="legend">
        <view class="legend-item"><view class="dot" />有场次</view>
        <view class="legend-item"><view class="dot mine" />我的计划 / 已报名</view>
      </view>
    </view>

    <!-- 当天安排 -->
    <view class="day-head">
      <text class="day-title">{{ picked.getMonth() + 1 }} 月 {{ picked.getDate() }} 日 · {{ tab === 'all' ? '线下安排' : '我的计划' }}</text>
      <text class="muted">共 {{ dayItems.length }} 项</text>
    </view>

    <view v-if="dayItems.length" class="timeline">
      <view v-for="it in dayItems" :key="it.id" class="tl-item">
        <view class="tl-time">
          <text class="tl-clock">{{ hm(it.startAt) }}</text>
          <text class="muted">{{ spanText(it) }}</text>
        </view>
        <view class="tl-card card">
          <view class="tl-tags">
            <text class="tag offline">线下课</text>
            <text v-if="it.myEnrollment" class="tag enrolled">{{ EnrollmentStatusLabel[it.myEnrollment.status] }}</text>
            <text v-else-if="it.planned" class="tag planned">已加入计划</text>
          </view>
          <view class="tl-title" @click="openCourse(it)">{{ it.product.title }}</view>
          <view class="tl-meta">{{ it.title }} · {{ it.address }}</view>
          <view class="tl-meta">剩余名额 {{ it.remaining }} / {{ it.quota }}</view>
          <view class="tl-actions">
            <text v-if="!it.myEnrollment" :class="['plan-btn', { on: it.planned }]" @click="togglePlan(it)">
              {{ it.planned ? '✓ 已加入计划' : '＋ 加入学习计划' }}
            </text>
            <text class="go-btn" @click="openCourse(it)">{{ it.myEnrollment ? '查看报名' : '查看课程' }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-else class="empty card">
      <view class="empty-icon"><view class="cal-top" /></view>
      <view class="empty-text">{{ tab === 'all' ? '当天暂无线下安排' : '当天暂无个人计划' }}</view>
      <view v-if="tab === 'mine'" class="muted">在「平台排期」中把感兴趣的场次加入计划，报名的场次会自动加入</view>
      <view v-if="tab === 'mine' && !mine.length" class="empty-go" @click="switchTab('all')">去看看平台排期 →</view>
      <view v-else-if="nextDay" class="empty-go" @click="pick(nextDay)">最近一场：{{ nextDay.getMonth() + 1 }} 月 {{ nextDay.getDate() }} 日 →</view>
    </view>
  </CertGate>
</template>

<script setup lang="ts">
import { EnrollmentStatusLabel } from '@luoji/shared';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';
import { api, type ScheduleItem } from '@/api';
import CertGate from '@/components/CertGate.vue';
import { useUserStore } from '@/stores/user';

const WEEK = ['一', '二', '三', '四', '五', '六', '日'];
const DAY = 86_400_000;

const user = useUserStore();
const tab = ref<'all' | 'mine'>('all');
const mode = ref<'week' | 'month'>('week');
const cursor = ref(startOfDay(new Date()));
const picked = ref(startOfDay(new Date()));
const all = ref<ScheduleItem[]>([]);
const mine = ref<ScheduleItem[]>([]);

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
const keyOf = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const todayKey = keyOf(new Date());
const pickedKey = computed(() => keyOf(picked.value));
/** 周一为一周第一天 */
const mondayOf = (d: Date) => new Date(startOfDay(d).getTime() - ((d.getDay() + 6) % 7) * DAY);

/** 当前视图要显示的日期：周视图 7 天，月视图 6 行 */
const range = computed(() => {
  if (mode.value === 'week') {
    const start = mondayOf(cursor.value);
    return { start, count: 7 };
  }
  const first = new Date(cursor.value.getFullYear(), cursor.value.getMonth(), 1);
  return { start: mondayOf(first), count: 42 };
});

/** 场次覆盖的每一天（多日课程每天都算） */
function coveredKeys(it: ScheduleItem) {
  const keys: string[] = [];
  for (let t = startOfDay(new Date(it.startAt)).getTime(); t <= new Date(it.endAt).getTime(); t += DAY) keys.push(keyOf(new Date(t)));
  return keys;
}
const byDay = (list: ScheduleItem[]) => {
  const map = new Map<string, ScheduleItem[]>();
  for (const it of list) for (const k of coveredKeys(it)) map.set(k, [...(map.get(k) ?? []), it]);
  return map;
};
const allByDay = computed(() => byDay(all.value));
const mineByDay = computed(() => byDay(mine.value));

const days = computed(() =>
  Array.from({ length: range.value.count }, (_, i) => {
    const date = new Date(range.value.start.getTime() + i * DAY);
    const key = keyOf(date);
    return { date, key, inMonth: date.getMonth() === cursor.value.getMonth(), has: allByDay.value.has(key), mine: mineByDay.value.has(key) };
  }),
);

const dayItems = computed(() => (tab.value === 'all' ? allByDay.value : mineByDay.value).get(pickedKey.value) ?? []);

/** 当天没有安排时，提示最近一场 */
const nextDay = computed(() => {
  const list = tab.value === 'all' ? all.value : mine.value;
  const next = list.find((it) => new Date(it.endAt) >= picked.value);
  return next ? startOfDay(new Date(next.startAt) > picked.value ? new Date(next.startAt) : picked.value) : null;
});

async function load() {
  // 取视图前后各留几天，跨月的多日课程也能显示
  const from = new Date(range.value.start.getTime() - 7 * DAY);
  const to = new Date(range.value.start.getTime() + (range.value.count + 7) * DAY);
  const [a, m] = await Promise.all([api.schedule(from.toISOString(), to.toISOString()), api.plans()]);
  all.value = a;
  mine.value = m;
}

function shift(n: number) {
  const c = cursor.value;
  cursor.value = mode.value === 'week' ? new Date(c.getTime() + n * 7 * DAY) : new Date(c.getFullYear(), c.getMonth() + n, 1);
  picked.value = mode.value === 'week' ? mondayOf(cursor.value) : cursor.value;
  load();
}

function setMode(m: 'week' | 'month') {
  mode.value = m;
  cursor.value = picked.value;
  load();
}

function pick(d: Date) {
  picked.value = startOfDay(d);
  if (keyOf(d) !== keyOf(cursor.value) && !days.value.some((x) => x.key === keyOf(d))) {
    cursor.value = picked.value;
    load();
  }
}

function switchTab(t: 'all' | 'mine') {
  tab.value = t;
}

async function togglePlan(it: ScheduleItem) {
  const res = it.planned ? await api.removePlan(it.id) : await api.addPlan(it.id);
  uni.showToast({ title: res.planned ? '已加入学习计划' : '已移出计划', icon: 'none' });
  await load();
}

const openCourse = (it: ScheduleItem) =>
  it.myEnrollment ? uni.navigateTo({ url: '/pages/offline/mine' }) : uni.navigateTo({ url: `/pages/course/detail?id=${it.product.id}` });

const pad = (n: number) => String(n).padStart(2, '0');
const hm = (s: string) => {
  const d = new Date(s);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
function spanText(it: ScheduleItem) {
  const n = coveredKeys(it).length;
  return n > 1 ? `共 ${n} 天` : '开始';
}

onLoad((q) => {
  if (q?.tab === 'mine') tab.value = 'mine';
});
onShow(async () => {
  await user.ensureLogin();
  if (user.certified) await load();
});
</script>

<style lang="scss" scoped>
.seg {
  display: flex;
  margin: 20rpx 28rpx 0;
  padding: 8rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.75);
  border: 1rpx solid #d9e5fb;
}
.seg-item {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  border-radius: 999rpx;
  font-size: 28rpx;
  color: $text-secondary;
  &.on {
    background: $brand-grad;
    color: #fff;
    font-weight: 600;
    box-shadow: 0 8rpx 20rpx rgba(42, 91, 215, 0.25);
  }
}
.cal {
  padding: 24rpx 20rpx 20rpx;
}
.cal-head {
  display: flex;
  align-items: center;
  padding: 0 12rpx 16rpx;
}
.cal-nav {
  padding: 0 20rpx;
  font-size: 40rpx;
  color: $brand;
}
.cal-month {
  font-size: 30rpx;
  font-weight: 600;
  min-width: 220rpx;
  text-align: center;
}
.mode {
  margin-left: auto;
  display: flex;
  padding: 4rpx;
  border-radius: 12rpx;
  background: $brand-soft;
}
.mode-item {
  padding: 6rpx 22rpx;
  border-radius: 10rpx;
  font-size: 24rpx;
  color: $text-secondary;
  &.on {
    background: #fff;
    color: $brand;
    font-weight: 600;
    box-shadow: 0 2rpx 8rpx rgba(42, 91, 215, 0.12);
  }
}
.week-names,
.days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}
.week-name {
  text-align: center;
  font-size: 22rpx;
  color: $text-weak;
  padding-bottom: 8rpx;
}
.day {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10rpx 0 6rpx;
  margin: 4rpx 6rpx;
  border-radius: 16rpx;
  &.other {
    opacity: 0.35;
  }
  &.today .day-num {
    color: $brand;
    font-weight: 700;
  }
  &.picked {
    background: $brand-grad;
    box-shadow: 0 8rpx 18rpx rgba(42, 91, 215, 0.25);
    .day-num {
      color: #fff;
    }
    .dot {
      background: #fff;
    }
  }
}
.day-num {
  font-size: 28rpx;
}
.day-dots {
  display: flex;
  gap: 6rpx;
  height: 12rpx;
  margin-top: 4rpx;
}
.dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: #7aa2f5;
  &.mine {
    background: #f08a3c;
  }
}
.legend {
  display: flex;
  justify-content: center;
  gap: 32rpx;
  margin-top: 12rpx;
  font-size: 20rpx;
  color: $text-weak;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.day-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin: 36rpx 36rpx 8rpx;
}
.day-title {
  font-size: 32rpx;
  font-weight: 600;
}
.timeline {
  padding: 0 28rpx 40rpx 0;
}
.tl-item {
  display: flex;
}
.tl-time {
  position: relative;
  width: 150rpx;
  flex-shrink: 0;
  padding: 36rpx 0 0 44rpx;
  display: flex;
  flex-direction: column;
  border-left: 2rpx solid #d6e3fb;
  margin-left: 36rpx;
  &::before {
    content: '';
    position: absolute;
    left: -10rpx;
    top: 44rpx;
    width: 14rpx;
    height: 14rpx;
    border-radius: 50%;
    border: 3rpx solid $brand;
    background: #fff;
  }
}
.tl-clock {
  font-size: 30rpx;
  font-weight: 600;
  color: $brand;
}
.tl-card {
  flex: 1;
  min-width: 0;
  margin: 16rpx 0;
}
.tl-tags {
  display: flex;
  gap: 10rpx;
  margin-bottom: 12rpx;
}
.tag {
  padding: 2rpx 14rpx;
  border-radius: 8rpx;
  font-size: 20rpx;
  &.offline {
    background: $brand-light;
    color: $brand;
  }
  &.enrolled {
    background: #e8f7ee;
    color: #138a4a;
  }
  &.planned {
    background: #fff3e6;
    color: #c2630c;
  }
}
.tl-title {
  font-size: 30rpx;
  font-weight: 600;
  line-height: 1.45;
  padding-bottom: 14rpx;
  margin-bottom: 10rpx;
  border-bottom: 1rpx solid $line;
}
.tl-meta {
  font-size: 24rpx;
  color: $text-secondary;
  margin-top: 6rpx;
}
.tl-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 22rpx;
}
.plan-btn {
  font-size: 24rpx;
  color: $brand;
  &.on {
    color: #c2630c;
  }
}
.go-btn {
  padding: 10rpx 26rpx;
  border-radius: 999rpx;
  background: $brand-grad;
  color: #fff;
  font-size: 24rpx;
}
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 56rpx 40rpx;
  text-align: center;
}
.empty-icon {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: $brand-soft;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8rpx;
}
.cal-top {
  width: 56rpx;
  height: 52rpx;
  border-radius: 10rpx;
  border: 4rpx solid #a9c2f2;
  border-top-width: 14rpx;
}
.empty-text {
  font-size: 28rpx;
  font-weight: 500;
}
.empty-go {
  margin-top: 12rpx;
  font-size: 26rpx;
  color: $brand;
}
</style>
