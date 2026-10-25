// src/lib/relativeTime.ts
// «منذ كذا» بالعربية بقواعد العدد الصحيحة (دقيقة/دقيقتان/3–10 دقائق/11+ دقيقة…). دوال نقيّة.

function unit(n: number, one: string, two: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n >= 3 && n <= 10) return `${n} ${few}`;
  return `${n} ${many}`;
}

/** فرق زمني بالمللي ثانية ← «منذ …» (الآن / دقائق / ساعات / أيام). */
export function agoArabic(diffMs: number): string {
  const sec = Math.max(0, Math.floor(diffMs / 1000));
  if (sec < 60) return "الآن";
  const min = Math.floor(sec / 60);
  if (min < 60) return `منذ ${unit(min, "دقيقة", "دقيقتين", "دقائق", "دقيقة")}`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `منذ ${unit(hr, "ساعة", "ساعتين", "ساعات", "ساعة")}`;
  const day = Math.floor(hr / 24);
  return `منذ ${unit(day, "يوم", "يومين", "أيام", "يوماً")}`;
}
