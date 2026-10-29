// src/lib/loginThrottle.ts
// حدّ محاولات الدخول الفاشلة لكل حساب، محفوظ في قاعدة البيانات (AppSetting، بلا تغيير مخطط).
// الحدّ في الذاكرة (rateLimit.ts) لكل نسخة خادم فقط فيضعف على Vercel؛ هذا يغلق التخمين الموزَّع
// على عناوين متعددة لحساب واحد. المنطق نقيّ (مُختبَر)، والتخزين دوال مستقلة تفشل «مفتوحةً» (لا تمنع الدخول عند خطأ القاعدة).
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

/** الحالة الحالية (null إن لم توجد أو تعذّرت القراءة). */
export async function getThrottle(key: string): Promise<ThrottleState | null> {
  try {
    const row = await prisma.appSetting.findUnique({ where: { key } });
    return parseState(row?.value);
  } catch {
    return null;
  }
}

export async function recordFailure(key: string, current: ThrottleState | null): Promise<void> {
  try {
    const next = nextStateOnFailure(current, Date.now());
    const value = JSON.stringify(next);
    await prisma.appSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
    // تنظيف انتهازي للمهجور (نحو 1 من 25 فشلاً) ضمن نطاق مفاتيحنا فقط.
    if (Math.random() < 0.04) {
      await prisma.appSetting.deleteMany({
        where: { key: { startsWith: KEY_PREFIX }, updatedAt: { lt: new Date(Date.now() - STALE_MS) } },
      });
    }
  } catch {
    /* الفشل مفتوح: لا نكسر الدخول */
  }
}

export async function clearThrottle(key: string): Promise<void> {
  try {
    await prisma.appSetting.deleteMany({ where: { key } });
  } catch {
    /* تجاهل */
  }
}
