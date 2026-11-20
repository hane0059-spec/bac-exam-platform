// src/lib/backupResilience.ts
// دوال نقيّة لمتانة النسخ الاحتياطي (scripts/db-backup.ts): تنظيف أجزاء `.part` المهجورة، وتمييز أخطاء الاتصال العابرة
// (تستحقّ إعادة المحاولة) عن الأخطاء الدائمة (لا تُعاد). خلفية: نسخة 2026-11-16 قُطعت أثناء انقطاع الشبكة/إغلاق العملية
// وتركت ملفّاً ناقصاً `.part`، وبقيت آخر نسخة كاملة قديمة 12 يوماً.

/** ملفّ نسخة غير مكتمل: نفس نمط اسم النسخة + `.part`. */
export const PART_RE = /^bac-backup-\d{4}-\d{2}-\d{2}_\d{4}\.ndjson\.gz\.part$/;

/** عمر أدنى (دقائق) قبل اعتبار `.part` مهجوراً؛ نسخة جارية تُحدِّث ملفّها باستمرار فلا تُمَسّ. */
export const STALE_PART_MINUTES = 30;

/**
 * هل هذا الملفّ جزء نسخة مهجور يجوز حذفه؟ (اسم صارم + لم يُعدَّل منذ STALE_PART_MINUTES).
 * لا يطابق أي ملفّ آخر مهما كان اسمه، فلا يُحذف شيء غير أجزاء النسخ.
 */
export function isStalePartFile(name: string, mtimeMs: number, nowMs: number): boolean {
  if (!PART_RE.test(name)) return false;
  return nowMs - mtimeMs >= STALE_PART_MINUTES * 60 * 1000;
}

const TRANSIENT_CODES = new Set(["P1001", "P1002", "P1008", "P1017", "P2024"]);
const TRANSIENT_TEXT =
  /can't reach database|timed out fetching|connection (was )?(closed|terminated|reset)|terminating connection|econnreset|econnrefused|etimedout|enotfound|eai_again|socket hang up|network|server has closed the connection|too many connections/i;

/** خطأ اتصال/شبكة عابر (يستحقّ إعادة المحاولة) لا خطأ برمجيّ أو إعداد دائم (مثل عميل Prisma القديم). */
export function isTransientDbError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const code = (e as { code?: unknown }).code;
  if (typeof code === "string" && TRANSIENT_CODES.has(code)) return true;
  const msg = e instanceof Error ? e.message : String((e as { message?: unknown }).message ?? "");
  return TRANSIENT_TEXT.test(msg);
}

/** مهل الانتظار (مللي ثانية) قبل كل إعادة محاولة: تصاعدية 30ث ثم 90ث ثم 180ث… */
export function retryDelayMs(attempt: number): number {
  const steps = [30_000, 90_000, 180_000];
  return steps[Math.min(Math.max(attempt, 1), steps.length) - 1];
}
