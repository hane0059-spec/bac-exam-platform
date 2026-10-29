import { describe, it, expect } from "vitest";
import { attachmentCacheControl, QUESTION_IMAGE_MAX_AGE } from "./attachmentCache";

describe("attachmentCacheControl", () => {
  it("صورة السؤال: private مع مدّة قصيرة (لا public ولا مدّة طويلة)", () => {
    const v = attachmentCacheControl("QUESTION_IMAGE");
    expect(v).toBe(`private, max-age=${QUESTION_IMAGE_MAX_AGE}`);
    expect(v).not.toContain("public");
    expect(QUESTION_IMAGE_MAX_AGE).toBeLessThanOrEqual(900);
  });

  it("ورقة الاختبار وصور إجابات الطلاب وأي نوع مجهول: no-store", () => {
    for (const k of ["EXAM_FILE", "ANSWER_UPLOAD", "SOMETHING_NEW", ""]) {
      expect(attachmentCacheControl(k)).toBe("private, no-store");
    }
  });
});
