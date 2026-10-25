// src/lib/staleSession.ts
// جلسات «قيد الأداء» العالقة (الطالب أغلق المتصفّح أو انقطع ولم يسلّم) — دوال نقيّة بلا قاعدة بيانات.
// الموعد النهائي للجلسة: بدء + مهلة الاختبار إن وُجدت، وإلا نهاية نافذة الإتاحة إن وُجدت، وإلا لا موعد.

/** مهلة سماح بعد الموعد النهائي قبل اعتبار الجلسة عالقة. */
export const STALE_GRACE_MS = 60 * 60 * 1000;
/** بلا مهلة ولا نافذة: تُعدّ الجلسة عالقة بعد هذه المدّة من آخر نشاط. */
export const NO_DEADLINE_IDLE_MS = 60 * 60 * 1000;

export interface StaleInput {
  startedAt: Date;
  /** آخر إجابة (أو null إن لم يجب شيئاً). */
  lastActivity: Date | null;
  timeLimitSec: number | null;
  availableUntil: Date | null;
  now?: number;
}

/** الموعد النهائي للجلسة أو null. */
export function sessionDeadline(i: Pick<StaleInput, "startedAt" | "timeLimitSec" | "availableUntil">): Date | null {
  if (i.timeLimitSec && i.timeLimitSec > 0) {
    return new Date(i.startedAt.getTime() + i.timeLimitSec * 1000);
  }
  return i.availableUntil;
}

/** هل الجلسة عالقة (تستحقّ أن يُنهيها المدرّس)؟ */
export function isStaleSession(i: StaleInput): boolean {
  const now = i.now ?? Date.now();
  const deadline = sessionDeadline(i);
  if (deadline) return now > deadline.getTime() + STALE_GRACE_MS;
  const last = (i.lastActivity ?? i.startedAt).getTime();
  return now > last + NO_DEADLINE_IDLE_MS;
}

/**
 * وقت الانتهاء المسجَّل عند إنهاء جلسة عالقة: الموعد النهائي إن مضى، وإلا آخر نشاط
 * (لا يسبق وقت البدء ولا يتجاوز الآن).
 */
export function staleEndedAt(i: StaleInput): Date {
  const now = i.now ?? Date.now();
  const deadline = sessionDeadline(i);
  const candidate =
    deadline && deadline.getTime() <= now ? deadline : i.lastActivity ?? i.startedAt;
  const t = Math.min(Math.max(candidate.getTime(), i.startedAt.getTime()), now);
  return new Date(t);
}
