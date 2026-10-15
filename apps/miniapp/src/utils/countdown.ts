import { onUnmounted, ref, watch, type Ref } from 'vue';

/** 剩余时间文案：2天 03:12:45 / 03:12:45；结束后为空串 */
export function useCountdown(endAt: Ref<string | null | undefined>) {
  const text = ref('');
  let timer: ReturnType<typeof setInterval> | undefined;

  const tick = () => {
    const ms = endAt.value ? new Date(endAt.value).getTime() - Date.now() : 0;
    if (ms <= 0) {
      text.value = '';
      clearInterval(timer);
      return;
    }
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const p = (n: number) => String(n).padStart(2, '0');
    const hms = `${p(Math.floor((s % 86400) / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
    text.value = d ? `${d}天 ${hms}` : hms;
  };

  watch(
    endAt,
    () => {
      clearInterval(timer);
      tick();
      if (text.value) timer = setInterval(tick, 1000);
    },
    { immediate: true },
  );
  onUnmounted(() => clearInterval(timer));
  return text;
}
