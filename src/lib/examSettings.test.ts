import { describe, it, expect } from "vitest";
import { parseSettings } from "./quizSettings";

describe("parseSettings — المراجعة مشتقّة من كشف التصحيح", () => {
  it("التصحيح في النهاية ⇒ مراجعة متاحة", () => {
    const s = parseSettings({ revealAnswers: "end" });
    expect(s.revealAnswers).toBe("end");
    expect(s.reviewBeforeSubmit).toBe(true);
  });
  it("التصحيح الفوري ⇒ لا مراجعة", () => {
    const s = parseSettings({ revealAnswers: "immediate" });
    expect(s.revealAnswers).toBe("immediate");
    expect(s.reviewBeforeSubmit).toBe(false);
  });
  it("إعدادات قديمة: reviewBeforeSubmit=true يعني نهاية الاختبار", () => {
    const s = parseSettings({ revealAnswers: "immediate", reviewBeforeSubmit: true });
    expect(s.revealAnswers).toBe("end");
    expect(s.reviewBeforeSubmit).toBe(true);
  });
  it("علم reviewBeforeSubmit=false المخزَّن لا يمنع المراجعة عند «end»", () => {
    const s = parseSettings({ revealAnswers: "end", reviewBeforeSubmit: false });
    expect(s.reviewBeforeSubmit).toBe(true);
  });
  it("بلا إعدادات ⇒ فوري وبلا مراجعة", () => {
    const s = parseSettings(null);
    expect(s.revealAnswers).toBe("immediate");
    expect(s.reviewBeforeSubmit).toBe(false);
  });
});
