// src/lib/certificate.ts
// عتبة شهادة التقدير ودرجة الشرف — مشتقّة من نسبة الاختبار بلا تغيير مخطط.

/** أدنى نسبة لاستحقاق شهادة تقدير. */
export const CERTIFICATE_THRESHOLD = 80;

/** درجة الشرف حسب النسبة، أو null إن لم تبلغ العتبة. */
export function certificateHonor(pct: number): string | null {
  if (pct >= 95) return "امتياز مع مرتبة الشرف";
  if (pct >= 90) return "امتياز";
  if (pct >= CERTIFICATE_THRESHOLD) return "تفوّق";
  return null;
}
