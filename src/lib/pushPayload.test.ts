import { describe, it, expect } from "vitest";
import {
  buildPushPayload,
  safePushUrl,
  urlBase64ToUint8Array,
  GENERIC_PUSH_BODY,
  PUSH_BODY_BY_TYPE,
  pushBodyForType,
  isAllowedPushEndpoint,
} from "./pushPayload";

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

describe("pushBodyForType", () => {
  it("عنوان مخصّص للأنواع المعروفة", () => {
    expect(pushBodyForType("ASSIGNED")).toBe("اختبار جديد مُسنَد إليك");
    expect(pushBodyForType("exam_needs_grading")).toBe("تسليم جديد بانتظار تصحيحك");
  });
  it("نوع مجهول أو فارغ ← النصّ العام", () => {
    expect(pushBodyForType("something_new")).toBe(GENERIC_PUSH_BODY);
    expect(pushBodyForType(null)).toBe(GENERIC_PUSH_BODY);
    expect(pushBodyForType(undefined)).toBe(GENERIC_PUSH_BODY);
  });
  it("الخصوصية: لا أرقام ولا قوالب في أي عنوان (لا درجات ولا أسماء تُحقَن)", () => {
    for (const body of Object.values(PUSH_BODY_BY_TYPE)) {
      expect(body).not.toMatch(/[0-9٠-٩%{}$]/);
    }
  });
});

describe("isAllowedPushEndpoint (منع SSRF)", () => {
  it("يقبل خدمات الدفع المعروفة", () => {
    for (const u of [
      "https://fcm.googleapis.com/fcm/send/abc",
      "https://updates.push.services.mozilla.com/wpush/v2/abc",
      "https://web.push.apple.com/QW1",
      "https://wns2-par02p.notify.windows.com/w/?token=x",
    ]) expect(isAllowedPushEndpoint(u)).toBe(true);
  });
  it("يرفض أي مضيف آخر وعناوين داخلية وخدعاً شائعة", () => {
    for (const u of [
      "https://evil.example.com/x",
      "https://localhost/x",
      "https://127.0.0.1/x",
      "https://169.254.169.254/latest/meta-data",
      "http://fcm.googleapis.com/x",
      "https://fcm.googleapis.com.evil.com/x",
      "https://evil.com/?h=fcm.googleapis.com",
      "https://user:pw@fcm.googleapis.com/x",
      "https://fcm.googleapis.com:8443/x",
      "https://notpush.apple.com.evil.io/x",
      "not a url",
    ]) expect(isAllowedPushEndpoint(u)).toBe(false);
  });
});
