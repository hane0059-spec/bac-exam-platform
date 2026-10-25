import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";
import {
  codeCandidates,
  normalizeStudentPassword,
  generateStudentPassword,
  normalizeDigits,
} from "./studentCredentials";
import { hashPasswordFor, verifyPasswordFor } from "./passwords";

describe("رمز الطالب المرن", () => {
  it("كل الصيغ تُنتج S-1002", () => {
    for (const typed of ["S-1002", "s-1002", "s1002", "S1002", "S 1002", "s_1002", "  s1002 ", "S-١٠٠٢", "1002", "١٠٠٢"]) {
      expect(codeCandidates(typed)).toContain("S-1002");
    }
  });
  it("رمز المدرّس T-… بلا خلط مع الطالب", () => {
    expect(codeCandidates("t1002")).toContain("T-1002");
    expect(codeCandidates("t1002")).not.toContain("S-1002");
  });
  it("الاسم والبريد لا يُنتجان رمزاً مختلقاً", () => {
    expect(codeCandidates("name@example.com")).toEqual(["name@example.com", "NAME@EXAMPLE.COM"]);
    expect(codeCandidates("أحمد علي").every((c) => !/^S-\d+$/.test(c))).toBe(true);
  });
  it("المحارف الخفيّة تُزال", () => {
    expect(codeCandidates("‏S-1002​")).toContain("S-1002");
  });
});

describe("كلمة سرّ الطالب", () => {
  it("تُوحَّد: أحرف صغيرة + أرقام لاتينية + بلا فراغ طرفي", () => {
    expect(normalizeStudentPassword("  K7M3Xa ")).toBe("k7m3xa");
    expect(normalizeStudentPassword("ab١٢")).toBe("ab12");
    expect(normalizeDigits("۱۲۳")).toBe("123");
  });
  it("المولَّدة: أحرف صغيرة وأرقام بلا متشابهات", () => {
    for (let i = 0; i < 200; i++) {
      const p = generateStudentPassword();
      expect(p).toMatch(/^[a-hj-km-np-z2-9]{6}$/);
    }
  });
});

describe("التحقّق حسب الدور", () => {
  it("حساب جديد: غير حسّاس للحالة", async () => {
    const hash = await hashPasswordFor("STUDENT", "K7m3Xa");
    for (const t of ["k7m3xa", "K7M3XA", "K7m3Xa", " k7m3xa "]) {
      expect((await verifyPasswordFor("STUDENT", t, hash)).ok).toBe(true);
    }
    expect((await verifyPasswordFor("STUDENT", "k7m3xb", hash)).ok).toBe(false);
  });
  it("حساب قديم بكلمة كبيرة (بطاقات قديمة): يدخل بالصغيرة ويُرحَّل", async () => {
    const legacy = await bcrypt.hash("K7M3XA", 10);
    const r = await verifyPasswordFor("STUDENT", "k7m3xa", legacy);
    expect(r.ok).toBe(true);
    expect(r.rehash).toBeTruthy();
    // بعد الترحيل: أيّ حالة تعمل
    expect((await verifyPasswordFor("STUDENT", "K7M3XA", r.rehash!)).ok).toBe(true);
    expect((await verifyPasswordFor("STUDENT", "k7m3xa", r.rehash!)).ok).toBe(true);
  });
  it("قديمة مختلطة الحالة: تنجح بالكتابة الدقيقة فقط وتُرحَّل", async () => {
    const legacy = await bcrypt.hash("Ab12Cd", 10);
    expect((await verifyPasswordFor("STUDENT", "ab12cd", legacy)).ok).toBe(false);
    const exact = await verifyPasswordFor("STUDENT", "Ab12Cd", legacy);
    expect(exact.ok).toBe(true);
    expect((await verifyPasswordFor("STUDENT", "ab12cd", exact.rehash!)).ok).toBe(true);
  });
  it("غير الطلاب: حسّاسة للحالة كما كانت", async () => {
    const hash = await hashPasswordFor("TEACHER", "Teacher@123");
    expect((await verifyPasswordFor("TEACHER", "Teacher@123", hash)).ok).toBe(true);
    expect((await verifyPasswordFor("TEACHER", "teacher@123", hash)).ok).toBe(false);
  });
});
