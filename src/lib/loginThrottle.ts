// src/lib/loginThrottle.ts
// حدّ محاولات الدخول الفاشلة لكل حساب، محفوظ في قاعدة البيانات (AppSetting، بلا تغيير مخطط).
// الحدّ في الذاكرة (rateLimit.ts) لكل نسخة خادم فقط فيضعف على Vercel؛ هذا يغلق التخمين الموزَّع
// على عناوين متعددة لحساب واحد. المنطق نقيّ (مُختبَر)، والحجز ذرّي في القاعدة ويفشل «مفتوحاً» (لا يمنع الدخول عند خطأ القاعدة).
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

export const MAX_FAILURES = 10;
export const WINDOW_MS = 15 * 60 * 1000;
export const LOCK_MS = 15 * 60 * 1000;
const KEY_PREFIX = "loginfail:";
const STALE_MS = 60 * 60 * 1000;

export interface ThrottleState {
  count: number;
  windowStart: number;
  lockedUntil?: number;
}

/** المدّة المتبقية للقفل بالمللي ثانية (0 = غير مقفل). */
export function lockRemainingMs(s: ThrottleState | null, now: number): number {
  if (!s?.lockedUntil) return 0;
  return Math.max(0, s.lockedUntil - now);
}

/** الحالة بعد محاولة فاشلة: نافذة ثابتة البداية، وعند بلوغ الحدّ يُقفل الحساب. */
export function nextStateOnFailure(s: ThrottleState | null, now: number): ThrottleState {
  if (s && lockRemainingMs(s, now) > 0) return s; // مقفل أصلاً: لا نمدّد القفل
  const fresh =
    !s || now - s.windowStart > WINDOW_MS || (s.lockedUntil !== undefined && s.lockedUntil <= now);
  const count = fresh ? 1 : s.count + 1;
  const windowStart = fresh ? now : s.windowStart;
  return count >= MAX_FAILURES
    ? { count, windowStart, lockedUntil: now + LOCK_MS }
    : { count, windowStart };
}

export function parseState(raw: string | null | undefined): ThrottleState | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Partial<ThrottleState>;
    if (typeof o.count !== "number" || typeof o.windowStart !== "number") return null;
    return {
      count: o.count,
      windowStart: o.windowStart,
      ...(typeof o.lockedUntil === "number" ? { lockedUntil: o.lockedUntil } : {}),
    };
  } catch {
    return null;
  }
}

/**
 * مفتاح الحساب: معرّف المستخدم إن وُجد، وإلا المُعرّف المكتوب (مُوحَّد الحالة). الحالتان تُعامَلان بالطريقة نفسها
 * فلا يكشف القفل وجود الحساب. مجزَّأ SHA-256 فلا يظهر المُعرّف في القاعدة.
 */
export function throttleKey(userId: string | undefined, identifier: string): string {
  const basis = userId ? `u:${userId}` : `i:${identifier.trim().toLowerCase().slice(0, 200)}`;
  return KEY_PREFIX + createHash("sha256").update(basis).digest("hex");
}

export function lockMessage(remainingMs: number): string {
  const minutes = Math.max(1, Math.ceil(remainingMs / 60000));
  return `محاولات دخول خاطئة كثيرة على هذا الحساب — حاول بعد ${minutes} دقيقة.`;
}

/**
 * يحجز محاولة دخول **ذرّياً قبل فحص كلمة السرّ**: داخل معاملة بقفل استشاري لكل حساب (يُسلسل الطلبات المتوازية)
 * يُقرأ العدّاد، فإن كان الحساب مقفلاً يُرفض، وإلا تُحسب هذه المحاولة فوراً (والعاشرة تُقفل ما بعدها).
 * بهذا لا يتجاوز التخمين المتوازي الحدّ (كان القراءة ثم الكتابة بعد الفحص تسمح بمئات المحاولات دفعةً).
 * نجاح الدخول يمسح العدّاد (`clearThrottle`). يفشل مفتوحاً: خطأ القاعدة لا يمنع الدخول.
 */
export async function reserveAttempt(key: string): Promise<{ allowed: boolean; remainingMs: number }> {
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // ::text لأنّ دالة القفل تُرجع void وPrisma لا يفكّ ترميزه.
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))::text`;
        const now = Date.now();
        const row = await tx.appSetting.findUnique({ where: { key } });
        const state = parseState(row?.value);
        const remaining = lockRemainingMs(state, now);
        if (remaining > 0) return { allowed: false, remainingMs: remaining };
        const value = JSON.stringify(nextStateOnFailure(state, now));
        await tx.appSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
        return { allowed: true, remainingMs: 0 };
      },
      { timeout: 10_000, maxWait: 10_000 }
    );
    // تنظيف انتهازي للمهجور (نحو 1 من 25 محاولة) ضمن نطاق مفاتيحنا فقط.
    if (Math.random() < 0.04) {
      await prisma.appSetting
        .deleteMany({
          where: { key: { startsWith: KEY_PREFIX }, updatedAt: { lt: new Date(Date.now() - STALE_MS) } },
        })
        .catch(() => {});
    }
    return result;
  } catch {
    return { allowed: true, remainingMs: 0 }; // فشل مفتوح
  }
}

export async function clearThrottle(key: string): Promise<void> {
  try {
    await prisma.appSetting.deleteMany({ where: { key } });
  } catch {
    /* تجاهل */
  }
}
