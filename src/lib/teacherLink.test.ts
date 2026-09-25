import { describe, it, expect, beforeAll } from "vitest";
import { teacherLinkToken, verifyTeacherLinkToken } from "./teacherLink";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-test-secret-test-secret-123";
});

describe("teacherLink", () => {
  it("يقبل التوقيع الصحيح", () => {
    expect(verifyTeacherLinkToken(teacherLinkToken("T-1001"))).toBe("T-1001");
  });
  it("يرفض رمزاً بلا توقيع أو بتوقيع مزوَّر أو رمز مدرّس آخر", () => {
    expect(verifyTeacherLinkToken("T-1001")).toBeNull();
    expect(verifyTeacherLinkToken("T-1001.aaaaaaaaaaaa")).toBeNull();
    const other = teacherLinkToken("T-1002").split(".")[1];
    expect(verifyTeacherLinkToken(`T-1001.${other}`)).toBeNull();
    expect(verifyTeacherLinkToken("")).toBeNull();
  });
});
