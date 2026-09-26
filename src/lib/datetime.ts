// src/lib/datetime.ts
// تنسيق تاريخ/وقت ثابت وواضح (يوم/شهر/سنة + 24 ساعة) بأرقام لاتينية.
// يُعرَض داخل <bdi dir="ltr"> لتفادي انعكاس الأرقام في سياق RTL.
export function formatDateTime(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(
    d.getHours()
  )}:${p(d.getMinutes())}`;
}

/**
 * تنسيق بمنطقة زمنية محدّدة (للتصدير على الخادم الذي يعمل بتوقيت UTC).
 * المنطقة تأتي من ترويسة Vercel `x-vercel-ip-timezone` (موقع المتصفّح)، وإلا UTC.
 */
export function formatDateTimeInZone(
  value: string | Date,
  timeZone?: string | null,
): string {
  const d = typeof value === "string" ? new Date(value) : value;
  let tz = timeZone || "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
  } catch {
    tz = "UTC";
  }
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${g("day")}/${g("month")}/${g("year")} ${g("hour")}:${g("minute")}`;
}
