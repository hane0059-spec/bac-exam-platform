// src/lib/rateLimit.ts
// محدّد معدّل بسيط في الذاكرة (best-effort، لكل نسخة خادم). يكفي نشراً بنسخة
// واحدة؛ عند التوسّع الأفقي يُستبدل بمخزن مشترك (Redis). يمنع التخمين العنيف.
interface Bucket {
  count: number;
  resetAt: number;
}
const buckets = new Map<string, Bucket>();

/** يُعيد true إن كان الطلب مسموحاً (ضمن الحدّ)، false إن تجاوز. */
export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    // تنظيف كسول للمنتهية لتفادي نموّ الذاكرة.
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (now > v.resetAt) buckets.delete(k);
    }
    return true;
  }
  b.count++;
  return b.count <= max;
}

/** عنوان العميل من الرؤوس (خلف وكيل). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
