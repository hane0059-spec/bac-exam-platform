// src/lib/badges.ts
// شارات إنجاز الطالب — مشتقّة بالكامل من بياناته الحالية (الجلسات المعتمدة + تقدّم
// المواد/الدروس) بلا تغيير مخطط ولا منافسة كاشفة. دالّة نقيّة قابلة للاختبار.
import type { SubjectProgress } from "@/lib/studentProgress";

/** عتبة اعتبار الدرس/المادة «متقَناً». */
export const BADGE_MASTERY = 80;

export interface Badge {
  id: string;
  icon: string;
  title: string;
  description: string;
  earned: boolean;
  /** التقدّم الحالي نحو الاستحقاق (للشارات ذات الهدف العددي). */
  current?: number;
  /** الهدف العددي للاستحقاق. */
  target?: number;
}

export interface BadgeInputs {
  /** عدد المحاولات المُنهاة المعتمدة (لا تصحيح معلّق). */
  finishedCount: number;
  /** أعلى نسبة بلغها الطالب، أو null إن لم ينهِ شيئاً. */
  bestPercentage: number | null;
  /** عدد المحاولات بنسبة 100٪. */
  perfectCount: number;
  /** تقدّم المواد (من getStudentProgress). */
  subjects: SubjectProgress[];
}

/** يحسب قائمة الشارات (محقَّقة ومقفلة) من بيانات الطالب. */
export function computeBadges(input: BadgeInputs): Badge[] {
  const { finishedCount, bestPercentage, perfectCount, subjects } = input;

  const masteredConcepts = subjects.reduce(
    (n, s) => n + s.concepts.filter((c) => c.masteryScore >= BADGE_MASTERY).length,
    0
  );
  const masteredSubjects = subjects.filter(
    (s) => s.masteryScore >= BADGE_MASTERY
  ).length;
  const best = bestPercentage ?? 0;

  return [
    {
      id: "first_step",
      icon: "🎯",
      title: "أوّل خطوة",
      description: "أنهيت أوّل اختبار",
      earned: finishedCount >= 1,
      current: Math.min(finishedCount, 1),
      target: 1,
    },
    {
      id: "persistent",
      icon: "🔥",
      title: "مثابرة",
      description: "أنهيت 5 اختبارات",
      earned: finishedCount >= 5,
      current: Math.min(finishedCount, 5),
      target: 5,
    },
    {
      id: "diligent",
      icon: "⭐",
      title: "مجتهد",
      description: "أنهيت 10 اختبارات",
      earned: finishedCount >= 10,
      current: Math.min(finishedCount, 10),
      target: 10,
    },
    {
      id: "high_score",
      icon: "🏅",
      title: "متفوّق",
      description: "بلغت 90٪ فأكثر في اختبار",
      earned: best >= 90,
    },
    {
      id: "perfect",
      icon: "💯",
      title: "علامة كاملة",
      description: "حصلت على 100٪ في اختبار",
      earned: perfectCount >= 1,
    },
    {
      id: "concept_master",
      icon: "📘",
      title: "إتقان درس",
      description: "أتقنت درساً (80٪ فأكثر)",
      earned: masteredConcepts >= 1,
      current: Math.min(masteredConcepts, 1),
      target: 1,
    },
    {
      id: "concept_master_5",
      icon: "📚",
      title: "متمكّن",
      description: "أتقنت 5 دروس",
      earned: masteredConcepts >= 5,
      current: Math.min(masteredConcepts, 5),
      target: 5,
    },
    {
      id: "subject_master",
      icon: "🎓",
      title: "خبير مادة",
      description: "أتقنت مادةً كاملة (80٪ فأكثر)",
      earned: masteredSubjects >= 1,
    },
  ];
}
