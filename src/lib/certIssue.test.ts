import { describe, it, expect } from "vitest";
import { normalizeIssuedStyle, issuedKey } from "./certIssue";

describe("normalizeIssuedStyle", () => {
  it("تصميم كامل صالح", () => {
    const s = normalizeIssuedStyle({
      theme: "royal",
      flag: ["#aa0000", "#ffffff", "#000000"],
      emblem: "cap",
      closing: " بارك الله فيك ",
      logo: "data:image/png;base64,AAAA",
    });
    expect(s).toEqual({
      theme: "royal",
      flag: ["#aa0000", "#ffffff", "#000000"],
      emblem: "cap",
      closing: "بارك الله فيك",
      logo: "data:image/png;base64,AAAA",
    });
  });
  it("قيم ناقصة ← افتراضيات آمنة، ونموذج مجهول ← الافتراضي", () => {
    const s = normalizeIssuedStyle({ theme: "nope" })!;
    expect(s.theme).toBe("emerald");
    expect(s.emblem).toBeNull();
    expect(s.logo).toBeNull();
    expect(s.closing).toBe("");
    expect(s.flag).toHaveLength(3);
  });
  it("شعار جاهز مجهول ← null", () => {
    expect(normalizeIssuedStyle({ theme: "navy", emblem: "dragon" })!.emblem).toBeNull();
  });
  it("يرفض لوناً غير صالح وشعاراً ليس صورة base64 وعبارة طويلة", () => {
    expect(normalizeIssuedStyle({ theme: "flag", flag: ["red", "#fff", "#000"] })).toBeNull();
    expect(normalizeIssuedStyle({ theme: "navy", logo: "javascript:alert(1)" })).toBeNull();
    expect(normalizeIssuedStyle({ theme: "navy", logo: "data:text/html;base64,AAAA" })).toBeNull();
    expect(normalizeIssuedStyle({ theme: "navy", closing: "x".repeat(91) })).toBeNull();
  });
  it("يرفض شعاراً أكبر من الحدّ", () => {
    expect(
      normalizeIssuedStyle({ theme: "navy", logo: "data:image/png;base64," + "A".repeat(260_000) })
    ).toBeNull();
  });
  it("مفتاح التخزين لكل (اختبار، طالب)", () => {
    expect(issuedKey("q1", "s1")).toBe("cert-issue:q1:s1");
  });
});
