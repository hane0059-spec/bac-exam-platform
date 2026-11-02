// src/lib/activityRange.ts
// فترات صفحة «النشاط» للمدير العام (دوال نقيّة). النشاط = آخر ظهور للمستخدم (`User.lastSeenAt`)،
// فالفترة الأطول تعرض من ظهر خلالها لا عدد زياراته.
export const ONLINE_MS = 5 * 60 * 1000; // متصل الآن
export const RECENT_MS = 30 * 60 * 1000; // نشط مؤخراً

export const ACTIVITY_RANGES = [
  { key: "30m", label: "30 دقيقة", ms: RECENT_MS },
  { key: "24h", label: "24 ساعة", ms: 24 * 60 * 60 * 1000 },
  { key: "7d", label: "أسبوع", ms: 7 * 24 * 60 * 60 * 1000 },
  { key: "30d", label: "شهر", ms: 30 * 24 * 60 * 60 * 1000 },
] as const;

export type ActivityRangeKey = (typeof ACTIVITY_RANGES)[number]["key"];
export const DEFAULT_ACTIVITY_RANGE: ActivityRangeKey = "24h";
/** أقصى عدد صفوف يُعرَض (الإجمالي الحقيقي يُعدّ بشكل مستقلّ). */
export const ACTIVITY_LIST_CAP = 300;

export function parseActivityRange(v: string | string[] | undefined) {
  const k = Array.isArray(v) ? v[0] : v;
  return ACTIVITY_RANGES.find((r) => r.key === k) ?? ACTIVITY_RANGES.find((r) => r.key === DEFAULT_ACTIVITY_RANGE)!;
}
