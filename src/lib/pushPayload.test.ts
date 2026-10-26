import { describe, it, expect } from "vitest";
import { buildPushPayload, safePushUrl, urlBase64ToUint8Array, GENERIC_PUSH_BODY } from "./pushPayload";

describe("safePushUrl", () => {
  it("يقبل المسارات الداخلية", () => {
    expect(safePushUrl("/teacher/sessions/abc?x=1")).toBe("/teacher/sessions/abc?x=1");
  });
  it("يرفض الروابط الخارجية وشبه الخارجية", () => {
    for (const u of ["https://evil.com", "//evil.com", "javascript:alert(1)", "/\\evil.com", "evil", ""]) {
      expect(safePushUrl(u)).toBe("/notifications");
    }
    expect(safePushUrl(null)).toBe("/notifications");
    expect(safePushUrl(undefined)).toBe("/notifications");
  });
});

describe("buildPushPayload", () => {
  it("النصّ عام ولا يحمل رسالة الإشعار", () => {
    const p = buildPushPayload({ title: "إتقان", linkUrl: "/student/quizzes" });
    expect(p).toEqual({ title: "إتقان", body: GENERIC_PUSH_BODY, url: "/student/quizzes" });
  });
  it("عنوان فارغ ← الافتراضي", () => {
    expect(buildPushPayload({ title: "  " }).title).toBe("إتقان");
  });
});

describe("urlBase64ToUint8Array", () => {
  it("يفكّ base64url بلا حشو", () => {
    // "hello" = aGVsbG8 (بلا =)
    expect(Array.from(urlBase64ToUint8Array("aGVsbG8"))).toEqual([104, 101, 108, 108, 111]);
  });
  it("يتعامل مع - و _", () => {
    // 0xfb 0xff = "-_8" في base64url
    expect(Array.from(urlBase64ToUint8Array("-_8"))).toEqual([0xfb, 0xff]);
  });
});
