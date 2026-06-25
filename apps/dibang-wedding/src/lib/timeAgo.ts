import { translate, useLangStore } from './i18n';

const lang = () => useLangStore.getState().lang;

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const sec = Math.floor(diff / 1000);
  const l = lang();
  if (sec < 60) return translate(l, 'timeAgo.justNow');
  const min = Math.floor(sec / 60);
  if (min < 60) return translate(l, 'timeAgo.minutes', { n: min });
  const hr = Math.floor(min / 60);
  if (hr < 24) return translate(l, 'timeAgo.hours', { n: hr });
  const day = Math.floor(hr / 24);
  return translate(l, 'timeAgo.days', { n: day });
}
