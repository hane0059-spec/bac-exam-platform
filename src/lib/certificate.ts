// src/lib/certificate.ts
// عتبة شهادة التقدير ودرجة الشرف — مشتقّة من نسبة الاختبار بلا تغيير مخطط.

/** أدنى نسبة لاستحقاق شهادة (حدّ النجاح في السلّم الدولي: 60%). */
export const CERTIFICATE_THRESHOLD = 60;

export type GradeTier = "honors" | "excellent" | "verygood" | "good" | "pass" | "participation";

export interface GradeInfo {
  tier: GradeTier;
  /** التقدير بالعربية. */
  honor: string;
  /** الحرف المقابل (A+ … D) في السلّم الدولي. */
  letter: string;
}

/**
 * سلّم التقديرات المتعارف عليه عالمياً (A–F الأنغلوسكسوني مع ما يقابله عربياً):
 * ≥95 امتياز مع مرتبة الشرف (A+) · 90–94 ممتاز (A) · 80–89 جيد جداً (B) ·
 * 70–79 جيد (C) · 60–69 مقبول (D) · أقل من 60 لا شهادة (F). null إن لم تبلغ حدّ النجاح.
 */
export function gradeInfo(pct: number): GradeInfo | null {
  if (pct >= 95) return { tier: "honors", honor: "امتياز مع مرتبة الشرف", letter: "A+" };
  if (pct >= 90) return { tier: "excellent", honor: "ممتاز", letter: "A" };
  if (pct >= 80) return { tier: "verygood", honor: "جيد جداً", letter: "B" };
  if (pct >= 70) return { tier: "good", honor: "جيد", letter: "C" };
  if (pct >= CERTIFICATE_THRESHOLD) return { tier: "pass", honor: "مقبول", letter: "D" };
  return null;
}

/** التقدير حسب النسبة، أو null إن لم تبلغ العتبة. */
export function certificateHonor(pct: number): string | null {
  return gradeInfo(pct)?.honor ?? null;
}

/**
 * هل يُمكن للمدرّس إصدار شهادة لهذه الجلسة؟ منتهية ومعتمدة (لا تصحيح معلّق) — أيّاً كانت نسبتها:
 * من بلغ حدّ النجاح ينال شهادة تقدير بتقديره، ومن دونه «شهادة مشاركة».
 */
export function eligibleForTeacherCertificate(s: {
  status: string;
  percentage?: number;
  needsGrading: boolean;
  pendingReview: boolean;
}): boolean {
  return (s.status === "COMPLETED" || s.status === "TIMED_OUT") && !s.needsGrading && !s.pendingReview;
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

/** نصوص الشهادة مؤنَّثة/مذكَّرة وبعبارات تناسب الدرجة (دالة نقيّة). */
export function certificateLines(d: CertificateData): CertificateLines {
  const f = d.female;
  const who = f ? "الطالبة" : "الطالب";
  const h = f ? "ها" : "ه";
  // «أداء» + الضمير تُكتَب الهمزة على ياء: أدائها / أدائه.
  const perf = f ? "ئها" : "ئه";
  const tier = gradeInfo(d.percentage)?.tier ?? "participation";
  const praise: Record<GradeTier, string> = {
    honors: `تقديراً لتفوّق${h} الباهر`,
    excellent: `تقديراً لتفوّق${h} الباهر`,
    verygood: `تقديراً لأدا${perf} المتميّز`,
    good: `تقديراً لجهد${h} وأدا${perf} الجيّد`,
    pass: `تقديراً لاجتهاد${h} ونجاح${h}`,
    participation: `تقديراً لمشاركت${h}`,
  };
  const wish =
    tier === "participation"
      ? `ونتمنّى ل${h} مزيداً من الجدّ والتقدّم.`
      : tier === "good" || tier === "pass"
        ? `ونتمنّى ل${h} مزيداً من التقدّم والنجاح.`
        : `ونتمنّى ل${h} دوام التوفيق والتميّز.`;
  return {
    title: tier === "participation" ? "شهادة مشاركة" : "شهادة تقدير",
    intro: `تتشرّف ${d.brandName} بمنح هذه الشهادة إلى ${who}`,
    body1: `${praise[tier]} في اختبار «${d.quizTitle}»`,
    body2: `في مادة ${d.subjectName}، حيث حقّق${f ? "ت" : ""} نسبة`,
    closing: d.closing?.trim() || wish,
    dateLabel: "التاريخ",
    signLabel: `المدرّس: ${d.teacherName}`,
  };
}

/** مهلة منع تكرار الإشعار عند نقرات متتابعة (إعادة الإشعار الصريحة بعدها تصل الطالب من جديد). */
export const RENOTIFY_COOLDOWN_MS = 10 * 60 * 1000;

/** نصّ إشعار الطالب بشهادته: جديدة (تقدير/مشاركة بحسب النسبة) أو محدَّثة إن أعاد المدرّس إشعاره. */
export function certificateNotifyMessage(quizTitle: string, percentage: number, updated = false): string {
  const kind = percentage >= CERTIFICATE_THRESHOLD ? "شهادة تقدير" : "شهادة مشاركة";
  return updated
    ? `حدّث مدرّسك ${kind} في اختبار «${quizTitle}» (${percentage}%) — افتحها وحمّلها بتصميمها الجديد.`
    : `أصدر لك مدرّسك ${kind} في اختبار «${quizTitle}» (${percentage}%) — افتحها وحمّلها.`;
}

/**
 * خطة الإشعار الجماعي: من بين الشهادات المؤهّلة (أفضل جلسة معتمدة لكل طالب) تُحدَّد ما طلبه المدرّس.
 * - `toNotify`: طلاب لم يُشعَروا بعدُ (إشعار جديد + حفظ التصميم).
 * - `renotify`: أُشعِروا سابقاً وليس قبل لحظات (إشعار «حُدِّثت شهادتك» + تصميم جديد) — إعادة الإشعار الصريحة تصل الطالب.
 * - `restyle`: أُشعِروا قبل لحظات (ضمن مهلة المنع) فيُحدَّث التصميم فقط منعاً للتكرار.
 * - `skipped`: معرّفات جلسات طُلبت وليست مؤهّلة/ليست لهذا الاختبار (تُتجاهَل بأمان).
 * مفتاح التكرار بالطالب لا بالجلسة (شهادة واحدة لكل طالب في الاختبار).
 */
export function planCertificateNotifications<T extends { sessionId: string; studentId: string }>(
  eligible: T[],
  requestedSessionIds: string[],
  alreadyNotifiedStudentIds: ReadonlySet<string>,
  recentlyNotifiedStudentIds: ReadonlySet<string> = new Set()
): { toNotify: T[]; renotify: T[]; restyle: T[]; skipped: string[] } {
  const bySession = new Map(eligible.map((e) => [e.sessionId, e]));
  const toNotify: T[] = [];
  const renotify: T[] = [];
  const restyle: T[] = [];
  const skipped: string[] = [];
  const seenStudents = new Set<string>();
  for (const id of new Set(requestedSessionIds)) {
    const e = bySession.get(id);
    if (!e) {
      skipped.push(id);
      continue;
    }
    if (seenStudents.has(e.studentId)) continue; // لا يتكرّر الطالب
    seenStudents.add(e.studentId);
    if (!alreadyNotifiedStudentIds.has(e.studentId)) toNotify.push(e);
    else if (recentlyNotifiedStudentIds.has(e.studentId)) restyle.push(e);
    else renotify.push(e);
  }
  return { toNotify, renotify, restyle, skipped };
}
