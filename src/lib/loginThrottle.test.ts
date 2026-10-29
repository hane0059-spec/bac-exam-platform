import { describe, it, expect } from "vitest";
import {
  MAX_FAILURES,
  WINDOW_MS,
  LOCK_MS,
  lockRemainingMs,
  nextStateOnFailure,
  parseState,
  throttleKey,
  lockMessage,
  type ThrottleState,
} from "./loginThrottle";

const T0 = 1_000_000;
function failN(n: number, start = T0, step = 1000): ThrottleState | null {
  let s: ThrottleState | null = null;
  for (let i = 0; i < n; i++) s = nextStateOnFailure(s, start + i * step);
  return s;
}

describe("loginThrottle", () => {
  it("لا يقفل قبل بلوغ الحدّ، ويقفل عند العاشرة", () => {
    const s9 = failN(MAX_FAILURES - 1)!;
    expect(s9.count).toBe(MAX_FAILURES - 1);
    expect(lockRemainingMs(s9, T0 + 20_000)).toBe(0);
    const s10 = failN(MAX_FAILURES)!;
    const now = T0 + (MAX_FAILURES - 1) * 1000;
    expect(lockRemainingMs(s10, now)).toBe(LOCK_MS);
  });

  it("القفل ينتهي بعد مدّته", () => {
    const s = failN(MAX_FAILURES)!;
    const lockedAt = T0 + (MAX_FAILURES - 1) * 1000;
    expect(lockRemainingMs(s, lockedAt + LOCK_MS - 1)).toBe(1);
    expect(lockRemainingMs(s, lockedAt + LOCK_MS)).toBe(0);
  });

  it("فشل أثناء القفل لا يمدّده", () => {
    const s = failN(MAX_FAILURES)!;
    const again = nextStateOnFailure(s, T0 + 60_000);
    expect(again.lockedUntil).toBe(s.lockedUntil);
    expect(again.count).toBe(s.count);
  });

  it("النافذة تُصفَّر بعد انقضائها وبعد انتهاء القفل", () => {
    const s5 = failN(5)!;
    const later = nextStateOnFailure(s5, s5.windowStart + WINDOW_MS + 1);
    expect(later.count).toBe(1);
    const locked = failN(MAX_FAILURES)!;
    const after = nextStateOnFailure(locked, locked.lockedUntil! + 1);
    expect(after.count).toBe(1);
    expect(after.lockedUntil).toBeUndefined();
  });

  it("parseState يرفض التالف ويقبل الصحيح", () => {
    expect(parseState(null)).toBeNull();
    expect(parseState("not json")).toBeNull();
    expect(parseState('{"count":"x"}')).toBeNull();
    expect(parseState('{"count":3,"windowStart":5}')).toEqual({ count: 3, windowStart: 5 });
    expect(parseState('{"count":10,"windowStart":5,"lockedUntil":9}')?.lockedUntil).toBe(9);
  });

  it("مفتاح الحساب: ثابت، مجزَّأ، لا يكشف المُعرّف، ويوحّد حالة الأحرف للمجهول", () => {
    const a = throttleKey(undefined, " Ali@Example.com ");
    expect(a).toBe(throttleKey(undefined, "ali@example.com"));
    expect(a).toMatch(/^loginfail:[0-9a-f]{64}$/);
    expect(a).not.toContain("ali");
    expect(throttleKey("u1", "x")).toBe(throttleKey("u1", "y")); // الموجود يُفتَح بمعرّفه لا بما كُتب
    expect(throttleKey("u1", "x")).not.toBe(throttleKey("u2", "x"));
  });

  it("رسالة القفل تقرّب الدقائق للأعلى وبحدّ أدنى دقيقة", () => {
    expect(lockMessage(1)).toContain("1 دقيقة");
    expect(lockMessage(LOCK_MS)).toContain("15 دقيقة");
    expect(lockMessage(61_000)).toContain("2 دقيقة");
  });
});
