import { describe, it, expect } from "vitest";
import {
  isStaleSession,
  sessionDeadline,
  staleEndedAt,
  STALE_GRACE_MS,
  NO_DEADLINE_IDLE_MS,
} from "./staleSession";

const H = 60 * 60 * 1000;
const t0 = new Date("2026-10-25T08:00:00Z");
const at = (ms: number) => new Date(t0.getTime() + ms);

describe("الجلسات العالقة", () => {
  it("الموعد النهائي: المهلة أولاً ثم نهاية النافذة", () => {
    expect(sessionDeadline({ startedAt: t0, timeLimitSec: 1800, availableUntil: at(10 * H) })).toEqual(at(0.5 * H));
    expect(sessionDeadline({ startedAt: t0, timeLimitSec: null, availableUntil: at(10 * H) })).toEqual(at(10 * H));
    expect(sessionDeadline({ startedAt: t0, timeLimitSec: null, availableUntil: null })).toBeNull();
  });

  it("بمهلة: عالقة بعد الموعد + ساعة سماح، لا قبلها", () => {
    const base = { startedAt: t0, lastActivity: null, timeLimitSec: 1800, availableUntil: null };
    expect(isStaleSession({ ...base, now: at(0.5 * H + STALE_GRACE_MS - 1000).getTime() })).toBe(false);
    expect(isStaleSession({ ...base, now: at(0.5 * H + STALE_GRACE_MS + 1000).getTime() })).toBe(true);
  });

  it("بلا مهلة وبنافذة إتاحة: الموعد نهاية النافذة", () => {
    const base = { startedAt: t0, lastActivity: at(0.2 * H), timeLimitSec: null, availableUntil: at(3 * H) };
    expect(isStaleSession({ ...base, now: at(3 * H + 30 * 60 * 1000).getTime() })).toBe(false);
    expect(isStaleSession({ ...base, now: at(3 * H + STALE_GRACE_MS + 1000).getTime() })).toBe(true);
  });

  it("بلا مهلة ولا نافذة: عالقة بعد ساعة من آخر نشاط", () => {
    const base = { startedAt: t0, lastActivity: at(1 * H), timeLimitSec: null, availableUntil: null };
    expect(isStaleSession({ ...base, now: at(1 * H + NO_DEADLINE_IDLE_MS - 1000).getTime() })).toBe(false);
    expect(isStaleSession({ ...base, now: at(1 * H + NO_DEADLINE_IDLE_MS + 1000).getTime() })).toBe(true);
    // بلا أي إجابة: من وقت البدء
    expect(isStaleSession({ ...base, lastActivity: null, now: at(NO_DEADLINE_IDLE_MS + 1000).getTime() })).toBe(true);
  });

  it("وقت الانتهاء: الموعد إن مضى، وإلا آخر نشاط، ضمن [البدء، الآن]", () => {
    const withLimit = { startedAt: t0, lastActivity: at(0.1 * H), timeLimitSec: 1800, availableUntil: null };
    expect(staleEndedAt({ ...withLimit, now: at(5 * H).getTime() })).toEqual(at(0.5 * H));
    const noDeadline = { startedAt: t0, lastActivity: at(2 * H), timeLimitSec: null, availableUntil: null };
    expect(staleEndedAt({ ...noDeadline, now: at(9 * H).getTime() })).toEqual(at(2 * H));
    expect(staleEndedAt({ ...noDeadline, lastActivity: null, now: at(9 * H).getTime() })).toEqual(t0);
    // موعد في المستقبل لا يُستعمل
    const future = { startedAt: t0, lastActivity: at(0.1 * H), timeLimitSec: 7200, availableUntil: null };
    expect(staleEndedAt({ ...future, now: at(0.3 * H).getTime() })).toEqual(at(0.1 * H));
  });
});
