import { describe, it, expect } from "vitest";
import {
  certificateHonor,
  certificateLines,
  gradeInfo,
  eligibleForTeacherCertificate,
  certificateNotifyMessage,
  planCertificateNotifications,
  type CertificateData,
} from "./certificate";
import { jpegToPdf, jpegsToPdf } from "./pdfImage";

const base: CertificateData = {
  studentName: "ليلى أحمد",
  female: true,
  quizTitle: "الأنسجة",
  subjectName: "علوم",
  percentage: 97,
  honor: "امتياز مع مرتبة الشرف",
  dateStr: "25/10/2026",
  teacherName: "محمد الحمود",
  brandName: "إتقان",
};

describe("شهادة المدرّس", () => {
  it("الأهلية: منتهية ومعتمدة فقط — أيّاً كانت النسبة", () => {
    const ok = { status: "COMPLETED", percentage: 65, needsGrading: false, pendingReview: false };
    expect(eligibleForTeacherCertificate(ok)).toBe(true);
    expect(eligibleForTeacherCertificate({ ...ok, percentage: 20 })).toBe(true);
    expect(eligibleForTeacherCertificate({ ...ok, pendingReview: true })).toBe(false);
    expect(eligibleForTeacherCertificate({ ...ok, needsGrading: true })).toBe(false);
    expect(eligibleForTeacherCertificate({ ...ok, status: "IN_PROGRESS" })).toBe(false);
    expect(eligibleForTeacherCertificate({ ...ok, status: "TIMED_OUT" })).toBe(true);
  });

  it("سلّم التقديرات الدولي (A–D) وحدوده", () => {
    const g = (p: number) => gradeInfo(p);
    expect(g(100)).toMatchObject({ honor: "امتياز مع مرتبة الشرف", letter: "A+", tier: "honors" });
    expect(g(95)).toMatchObject({ letter: "A+" });
    expect(g(94.9)).toMatchObject({ honor: "ممتاز", letter: "A" });
    expect(g(90)).toMatchObject({ honor: "ممتاز" });
    expect(g(89.9)).toMatchObject({ honor: "جيد جداً", letter: "B" });
    expect(g(80)).toMatchObject({ honor: "جيد جداً" });
    expect(g(79.9)).toMatchObject({ honor: "جيد", letter: "C" });
    expect(g(70)).toMatchObject({ honor: "جيد" });
    expect(g(69.9)).toMatchObject({ honor: "مقبول", letter: "D" });
    expect(g(65)).toMatchObject({ honor: "مقبول", tier: "pass" });
    expect(g(60)).toMatchObject({ honor: "مقبول" });
    expect(g(59.9)).toBeNull();
    expect(certificateHonor(96)).toBe("امتياز مع مرتبة الشرف");
    expect(certificateHonor(40)).toBeNull();
  });

  it("عبارات الشهادة تناسب الدرجة", () => {
    expect(certificateLines({ ...base, percentage: 97 }).body1).toContain("تفوّقها الباهر");
    expect(certificateLines({ ...base, percentage: 85 }).body1).toContain("أدائها المتميّز");
    expect(certificateLines({ ...base, percentage: 75 }).body1).toContain("جهدها وأدائها الجيّد");
    const pass = certificateLines({ ...base, percentage: 65, female: false });
    expect(pass.body1).toContain("تقديراً لاجتهاده ونجاحه");
    expect(pass.closing).toBe("ونتمنّى له مزيداً من التقدّم والنجاح.");
    expect(certificateLines({ ...base, percentage: 97 }).closing).toBe("ونتمنّى لها دوام التوفيق والتميّز.");
  });

  it("النصوص مؤنَّثة ومذكَّرة", () => {
    const f = certificateLines(base);
    expect(f.intro).toContain("الطالبة");
    expect(f.body1).toContain("تفوّقها");
    expect(f.body2).toContain("حقّقت نسبة");
    expect(f.closing).toBe("ونتمنّى لها دوام التوفيق والتميّز.");
    const m = certificateLines({ ...base, female: false });
    expect(m.intro).toContain("الطالب");
    expect(m.intro).not.toContain("الطالبة");
    expect(m.body1).toContain("تفوّقه");
    expect(m.body2).toContain("حقّق نسبة");
    expect(m.body2).toBe("في مادة علوم، حيث حقّق نسبة");
    expect(m.signLabel).toBe("المدرّس: محمد الحمود");
  });

  it("شهادة مشاركة لمن دون حدّ النجاح", () => {
    const m = certificateLines({ ...base, percentage: 40, female: false, honor: "مشارك" });
    expect(m.title).toBe("شهادة مشاركة");
    expect(m.body1).toContain("تقديراً لمشاركته في اختبار");
    expect(m.closing).toBe("ونتمنّى له مزيداً من الجدّ والتقدّم.");
    expect(certificateLines({ ...base, percentage: 59.9 }).title).toBe("شهادة مشاركة");
    expect(certificateLines({ ...base, percentage: 60 }).title).toBe("شهادة تقدير");
    expect(certificateLines({ ...base, percentage: 40 }).body1).toContain("لمشاركتها");
  });

  it("عبارة الختام المخصّصة تحلّ محلّ الافتراضية", () => {
    expect(certificateLines({ ...base, closing: "  مبارك!  " }).closing).toBe("مبارك!");
  });
});

describe("jpegToPdf", () => {
  it("ينتج PDF سليم البنية وجدول مراجع مطابق للإزاحات", () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 0xff, 0xd9]);
    const pdf = jpegToPdf(jpeg, 2000, 1414);
    const s = new TextDecoder("latin1").decode(pdf);
    expect(s.startsWith("%PDF-1.4")).toBe(true);
    expect(s.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(s).toContain("/Filter /DCTDecode");
    expect(s).toContain("/Width 2000 /Height 1414");
    expect(s).toContain("/MediaBox [0 0 842 595]");
    // كل إزاحة في xref تشير فعلاً إلى «N 0 obj»
    const xref = s.slice(s.indexOf("xref\n0 6"));
    const offs = [...xref.matchAll(/(\d{10}) 00000 n/g)].map((m) => Number(m[1]));
    expect(offs).toHaveLength(5);
    offs.forEach((o, i) => expect(s.slice(o, o + 8)).toBe(`${i + 1} 0 obj\n`));
    const startxref = Number(/startxref\n(\d+)/.exec(s)![1]);
    expect(s.slice(startxref, startxref + 4)).toBe("xref");
    // بايتات JPEG محفوظة كما هي
    const idx = s.indexOf("stream\n") + 7;
    expect([...pdf.slice(idx, idx + jpeg.length)]).toEqual([...jpeg]);
  });

  it("jpegsToPdf: عدّة صفحات بجدول مراجع مطابق", () => {
    const j = (k: number) => new Uint8Array([0xff, 0xd8, 0xff, 0xe0, k, k, k, 0xff, 0xd9]);
    const pdf = jpegsToPdf([
      { jpeg: j(1), widthPx: 2000, heightPx: 1414 },
      { jpeg: j(2), widthPx: 2000, heightPx: 1414 },
      { jpeg: j(3), widthPx: 2000, heightPx: 1414 },
    ]);
    const s = new TextDecoder("latin1").decode(pdf);
    expect(s).toContain("/Count 3");
    expect(s).toContain("/Kids [3 0 R 6 0 R 9 0 R]");
    expect(s).toContain("xref\n0 12");
    const xref = s.slice(s.indexOf("xref\n0 12"));
    const offs = [...xref.matchAll(/(\d{10}) 00000 n/g)].map((m) => Number(m[1]));
    expect(offs).toHaveLength(11);
    offs.forEach((o, i) => expect(s.slice(o, o + `${i + 1} 0 obj\n`.length)).toBe(`${i + 1} 0 obj\n`));
  });
});

describe("إشعار الشهادات الجماعي", () => {
  it("نصّ الإشعار: تقدير فوق الحدّ ومشاركة دونه", () => {
    expect(certificateNotifyMessage("الأنسجة", 85)).toContain("شهادة تقدير");
    expect(certificateNotifyMessage("الأنسجة", 85)).toContain("(85%)");
    expect(certificateNotifyMessage("الأنسجة", 40)).toContain("شهادة مشاركة");
    expect(certificateNotifyMessage("الأنسجة", 60)).toContain("شهادة تقدير");
  });

  it("الخطة: جديد/تحديث تصميم/متجاهَل، بلا تكرار طالب أو جلسة", () => {
    const eligible = [
      { sessionId: "s1", studentId: "a" },
      { sessionId: "s2", studentId: "b" },
      { sessionId: "s3", studentId: "c" },
    ];
    const plan = planCertificateNotifications(
      eligible,
      ["s1", "s2", "s2", "ghost", "s1"],
      new Set(["b"])
    );
    expect(plan.toNotify.map((x) => x.studentId)).toEqual(["a"]);
    expect(plan.restyle.map((x) => x.studentId)).toEqual(["b"]);
    expect(plan.skipped).toEqual(["ghost"]);
  });

  it("الخطة: جلسة غير مؤهّلة (ليست في القائمة) لا تُشعِر أحداً", () => {
    const plan = planCertificateNotifications([{ sessionId: "s1", studentId: "a" }], ["other"], new Set());
    expect(plan.toNotify).toEqual([]);
    expect(plan.restyle).toEqual([]);
    expect(plan.skipped).toEqual(["other"]);
  });
});
