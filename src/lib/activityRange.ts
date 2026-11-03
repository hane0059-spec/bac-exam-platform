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
/** أقصى مرشّحين يُجلَبون للبحث المطبَّع في الخادم (فوقه تُعرَض الأحدث فقط). */
export const ACTIVITY_SEARCH_POOL = 5000;

export function parseActivityRange(v: string | string[] | undefined) {
  const k = Array.isArray(v) ? v[0] : v;
  return ACTIVITY_RANGES.find((r) => r.key === k) ?? ACTIVITY_RANGES.find((r) => r.key === DEFAULT_ACTIVITY_RANGE)!;
}

// ── تصفية الدور والبحث (صفحة النشاط) ──
export const ROLE_FILTERS = [
  { key: "ALL", label: "الكل" },
  { key: "STUDENT", label: "الطلاب" },
  { key: "TEACHER", label: "المدرّسون" },
  { key: "PARENT", label: "أولياء الأمور" },
  { key: "ADMIN", label: "المدراء" },
] as const;
export type RoleFilterKey = (typeof ROLE_FILTERS)[number]["key"];

export function parseRoleFilter(v: string | string[] | undefined): RoleFilterKey {
  const k = Array.isArray(v) ? v[0] : v;
  return ROLE_FILTERS.find((r) => r.key === k)?.key ?? "ALL";
}

/** كلمات البحث: تُقصّ المسافات وتُحدَّد بـ6 كلمات و60 حرفاً لكلٍّ (حماية من استعلام ضخم). */
export function searchTokens(q: string | string[] | undefined): string[] {
  const raw = (Array.isArray(q) ? q[0] : q) ?? "";
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .map((t) => t.slice(0, 60));
}

/** رابط الصفحة مع الحفاظ على الفترة والدور والبحث (القيم الافتراضية تُحذَف من الرابط). */
export function activityHref(p: { range: string; role: RoleFilterKey; q: string }): string {
  const qs = new URLSearchParams();
  qs.set("range", p.range);
  if (p.role !== "ALL") qs.set("role", p.role);
  if (p.q.trim()) qs.set("q", p.q.trim());
  return `/admin/activity?${qs.toString()}`;
}
