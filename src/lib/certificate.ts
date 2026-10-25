// src/lib/certificate.ts
// عتبة شهادة التقدير ودرجة الشرف — مشتقّة من نسبة الاختبار بلا تغيير مخطط.

/** أدنى نسبة لاستحقاق شهادة تقدير (يطبعها الطالب بنفسه). */
export const CERTIFICATE_THRESHOLD = 80;

/** أدنى نسبة لتُصدِر له المدرّس شهادة تقدير رسمية ملوّنة (صورة/PDF). */
export const TEACHER_CERTIFICATE_THRESHOLD = 95;

/** درجة الشرف حسب النسبة، أو null إن لم تبلغ العتبة. */
export function certificateHonor(pct: number): string | null {
  if (pct >= 95) return "امتياز مع مرتبة الشرف";
  if (pct >= 90) return "امتياز";
  if (pct >= CERTIFICATE_THRESHOLD) return "تفوّق";
  return null;
}

/** هل تستحقّ الجلسة شهادة المدرّس؟ منتهية، معتمدة (لا تصحيح معلّق)، ونسبتها ≥ العتبة. */
export function eligibleForTeacherCertificate(s: {
  status: string;
  percentage: number;
  needsGrading: boolean;
  pendingReview: boolean;
}): boolean {
  return (
    (s.status === "COMPLETED" || s.status === "TIMED_OUT") &&
    !s.needsGrading &&
    !s.pendingReview &&
    s.percentage >= TEACHER_CERTIFICATE_THRESHOLD
  );
}

export interface CertificateData {
  studentName: string;
  female: boolean;
  quizTitle: string;
  subjectName: string;
  percentage: number;
  honor: string;
  /** تاريخ الإنجاز نصّاً جاهزاً (DD/MM/YYYY). */
  dateStr: string;
  teacherName: string;
  brandName: string;
  /** عبارة ختام اختيارية يكتبها المدرّس؛ الفارغة ← العبارة الافتراضية. */
  closing?: string;
}

export interface CertificateLines {
  title: string;
  intro: string;
  body1: string;
  body2: string;
  closing: string;
  dateLabel: string;
  signLabel: string;
}

/** نصوص الشهادة مؤنَّثة/مذكَّرة (دالة نقيّة). */
export function certificateLines(d: CertificateData): CertificateLines {
  const f = d.female;
  const who = f ? "الطالبة" : "الطالب";
  return {
    title: "شهادة تقدير",
    intro: `تتشرّف ${d.brandName} بمنح هذه الشهادة إلى ${who}`,
    body1: `تقديراً لتفوّق${f ? "ها" : "ه"} الباهر في اختبار «${d.quizTitle}»`,
    body2: `في مادة ${d.subjectName}، حيث حقّق${f ? "ت" : ""} نسبة`,
    closing:
      d.closing?.trim() || `ونتمنّى ل${f ? "ها" : "ه"} دوام التوفيق والتميّز.`,
    dateLabel: "التاريخ",
    signLabel: `المدرّس: ${d.teacherName}`,
  };
}
