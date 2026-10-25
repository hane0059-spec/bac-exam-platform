import { describe, it, expect } from "vitest";
import {
  certificateHonor,
  certificateLines,
  eligibleForTeacherCertificate,
  TEACHER_CERTIFICATE_THRESHOLD,
  type CertificateData,
} from "./certificate";
import { jpegToPdf } from "./pdfImage";

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
  it("العتبة 95 والأهلية تشترط الاعتماد", () => {
    expect(TEACHER_CERTIFICATE_THRESHOLD).toBe(95);
    const ok = { status: "COMPLETED", percentage: 95, needsGrading: false, pendingReview: false };
    expect(eligibleForTeacherCertificate(ok)).toBe(true);
    expect(eligibleForTeacherCertificate({ ...ok, percentage: 94.9 })).toBe(false);
    expect(eligibleForTeacherCertificate({ ...ok, pendingReview: true })).toBe(false);
    expect(eligibleForTeacherCertificate({ ...ok, needsGrading: true })).toBe(false);
    expect(eligibleForTeacherCertificate({ ...ok, status: "IN_PROGRESS" })).toBe(false);
    expect(eligibleForTeacherCertificate({ ...ok, status: "TIMED_OUT" })).toBe(true);
    expect(certificateHonor(96)).toBe("امتياز مع مرتبة الشرف");
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
});
