// src/lib/teacherPurge.ts
// «حذف كامل» لحساب مدرّس مع كل ما أنشأه (طلاب/اختبارات/أسئلة/إثراء…) — لحسابات التجربة أو الأخطاء.
// الحذف العاديّ (DELETE /api/admin/users/[id]) يرفض أي مدرّس أنشأ شيئاً (حتى المخفيّ كسؤالٍ كُتب داخل اختبار
// أو اختبارٍ مؤرشف)، وهذا الحذف الشامل بديله بتأكيد مشدّد. قابل للاستئناف: يعمل ضمن مهلة ثم يعيد `done:false`
// فيعيد المستدعي الطلب (كل خطوة تُكمَل لتبقى القاعدة متّسقة، والأخطاء الجزئية آمنة لإعادة التشغيل).
// الحراسة (دور المستدعي/عزل المؤسّسة/ليس النفس ولا المدير العام) مسؤوليّة المستدعي.
import { prisma } from "@/lib/prisma";
import { deleteStudentCompletely } from "@/lib/teacherStudents";

/** هل طابق النصّ المكتوب اسم الحساب (الاسم الأول + الكنية) مع تجاهل تكرار/اختلاف الفراغات فقط؟ */
export function purgeConfirmMatches(typed: string, firstName: string, lastName: string): boolean {
  const norm = (s: string) => s.replace(/\s+/g, " ").trim();
  const t = norm(typed);
  return t.length > 0 && t === norm(`${firstName} ${lastName}`);
}

export interface PurgePreview {
  name: string;
  isActive: boolean;
  /** طلاب أنشأهم المدرّس وسيُحذفون بكل نتائجهم (ليس لهم مدرّس آخر). */
  studentsToDelete: number;
  /** طلاب أنشأهم لكنّهم مسجَّلون عند مدرّس آخر: يبقون ويُفصَلون عنه فقط. */
  studentsToKeep: number;
  quizzes: { total: number; draft: number; published: number; archived: number };
  /** جلسات الطلاب (النتائج) على اختباراته: تُحذف مع الاختبارات. */
  sessionsOnQuizzes: number;
  questions: { total: number; inBank: number; hidden: number };
  /** ملفّات إثراء خاصّة به (تُحذف) ومعتمَدة عامّة رفعها (تبقى في الصفحة العامّة). */
  enrichmentPrivate: number;
  enrichmentPublicKept: number;
  /** أسئلة له داخل اختبارات مدرّسين آخرين (تمنع الحذف الشامل حتى تُعالَج). */
  questionsUsedByOthers: number;
}

export async function teacherPurgePreview(teacherId: string): Promise<PurgePreview | null> {
  const t = await prisma.user.findUnique({
    where: { id: teacherId },
    select: { firstName: true, lastName: true, isActive: true },
  });
  if (!t) return null;
  const sharedWhere = {
    createdById: teacherId,
    role: "STUDENT" as const,
    studentEnrollments: { some: { isActive: true, teacherId: { not: teacherId } } },
  };
  const [
    studentsAll, studentsShared, quizGroups, sessionsOnQuizzes, qTotal, qHidden, enrichPrivate, enrichPublic, foreignNodes,
  ] = await Promise.all([
    prisma.user.count({ where: { createdById: teacherId, role: "STUDENT" } }),
    prisma.user.count({ where: sharedWhere }),
    prisma.quiz.groupBy({ by: ["status"], where: { creatorId: teacherId }, _count: { _all: true } }),
    prisma.examSession.count({ where: { quiz: { creatorId: teacherId } } }),
    prisma.question.count({ where: { creatorId: teacherId } }),
    prisma.question.count({ where: { creatorId: teacherId, inBank: false } }),
    prisma.enrichmentFile.count({ where: { teacherId } }),
    prisma.enrichmentFile.count({ where: { uploadedById: teacherId, teacherId: null } }),
    prisma.quizNode.count({ where: { question: { creatorId: teacherId }, quiz: { creatorId: { not: teacherId } } } }),
  ]);
  const by = (s: string) => quizGroups.find((g) => g.status === s)?._count._all ?? 0;
  return {
    name: `${t.firstName} ${t.lastName}`.trim(),
    isActive: t.isActive,
    studentsToDelete: studentsAll - studentsShared,
    studentsToKeep: studentsShared,
    quizzes: {
      total: quizGroups.reduce((n, g) => n + g._count._all, 0),
      draft: by("DRAFT"),
      published: by("PUBLISHED"),
      archived: by("ARCHIVED"),
    },
    sessionsOnQuizzes,
    questions: { total: qTotal, inBank: qTotal - qHidden, hidden: qHidden },
    enrichmentPrivate: enrichPrivate,
    enrichmentPublicKept: enrichPublic,
    questionsUsedByOthers: foreignNodes,
  };
}

export interface PurgeProgress {
  students: number;
  detachedStudents: number;
  quizzes: number;
  questions: number;
}
export type PurgeResult =
  | { done: boolean; progress: PurgeProgress }
  | { blocked: string };

/** حذف اختبار بكل جلساته وتفاصيله (على عكس الحذف النهائيّ العاديّ الذي يُبقي الدرجات). */
async function deleteQuizFully(quizId: string) {
  await prisma.$transaction([
    prisma.studentAnswer.deleteMany({ where: { session: { quizId } } }),
    // ملف الاختبار الورقيّ + صور إجابات الجلسات (تعليقاتها تُحذف cascade).
    prisma.attachment.deleteMany({ where: { OR: [{ quizId }, { session: { quizId } }] } }),
    // الجلسات (الاعتراضات والرسائل المرتبطة بها cascade).
    prisma.examSession.deleteMany({ where: { quizId } }),
    prisma.quizAssignment.deleteMany({ where: { quizId } }),
    // تصاميم الشهادات المحفوظة لهذا الاختبار (مفاتيح محدّدة بمعرّفه).
    prisma.appSetting.deleteMany({
      where: { OR: [{ key: `cert-issue-all:${quizId}` }, { key: { startsWith: `cert-issue:${quizId}:` } }] },
    }),
    // العُقد والحوافّ تُحذف cascade مع الاختبار.
    prisma.quiz.delete({ where: { id: quizId } }),
  ]);
}

/**
 * ينفّذ الحذف الشامل ضمن ميزانية زمنية (`budgetMs`). يعيد `done:true` عند الانتهاء (المدرّس حُذف)،
 * و`done:false` إن بقي عمل (أعد الاستدعاء)، أو `blocked` بسبب لا يُحَلّ تلقائياً.
 * `actorId` هو مَن يُجري الحذف: تُنقَل إليه ملكيّة ملفّات الإثراء العامّة المعتمَدة التي رفعها المدرّس فتبقى منشورة.
 */
export async function runTeacherPurge(teacherId: string, actorId: string, budgetMs: number): Promise<PurgeResult> {
  const deadline = Date.now() + budgetMs;
  const timeUp = () => Date.now() >= deadline;
  const progress: PurgeProgress = { students: 0, detachedStudents: 0, quizzes: 0, questions: 0 };

  const meta = await prisma.user.findUnique({
    where: { id: teacherId },
    select: { schoolId: true, teacherProfile: { select: { isIndependent: true } } },
  });
  if (!meta) return { done: true, progress };

  // 0) تعطيل الحساب فوراً حتى لا يُنشئ شيئاً أثناء الحذف.
  await prisma.user.update({ where: { id: teacherId }, data: { isActive: false } });

  // 1) الطلاب الذين أنشأهم: المنفرد يُحذف بنتائجه، والمشترك مع مدرّس آخر يُفصَل عنه فقط.
  for (;;) {
    const batch = await prisma.user.findMany({
      where: { createdById: teacherId, role: "STUDENT" },
      take: 20,
      select: {
        id: true,
        studentEnrollments: { where: { isActive: true, teacherId: { not: teacherId } }, select: { id: true }, take: 1 },
      },
    });
    if (batch.length === 0) break;
    for (const s of batch) {
      if (timeUp()) return { done: false, progress };
      if (s.studentEnrollments.length > 0) {
        await prisma.user.update({ where: { id: s.id }, data: { createdById: null } });
        progress.detachedStudents++;
      } else {
        await deleteStudentCompletely(s.id);
        progress.students++;
      }
    }
  }

  // 2) اختباراته (كل الحالات) بجلساتها.
  for (;;) {
    const quizzes = await prisma.quiz.findMany({ where: { creatorId: teacherId }, take: 10, select: { id: true } });
    if (quizzes.length === 0) break;
    for (const q of quizzes) {
      if (timeUp()) return { done: false, progress };
      await deleteQuizFully(q.id);
      progress.quizzes++;
    }
  }

  // 3) أسئلته: يُمنع إن كانت مستعمَلة في اختبار مدرّس آخر (حذفها يكسر ذلك الاختبار).
  const foreign = await prisma.quizNode.count({
    where: { question: { creatorId: teacherId }, quiz: { creatorId: { not: teacherId } } },
  });
  if (foreign > 0) {
    return { blocked: `لا يمكن الحذف الشامل: ${foreign} من أسئلته مستعمَلة داخل اختبارات مدرّسين آخرين. أزلها من تلك الاختبارات أو عطّل الحساب.` };
  }
  for (;;) {
    const qs = await prisma.question.findMany({ where: { creatorId: teacherId }, take: 100, select: { id: true } });
    if (qs.length === 0) break;
    if (timeUp()) return { done: false, progress };
    const ids = qs.map((q) => q.id);
    await prisma.$transaction([
      prisma.studentAnswer.deleteMany({ where: { questionId: { in: ids } } }),
      // خيارات الأسئلة والأزواج والبلاغات والصور تُحذف cascade.
      prisma.question.deleteMany({ where: { id: { in: ids } } }),
    ]);
    progress.questions += ids.length;
  }

  // 4) ما تبقّى: إثراؤه الخاصّ (وطلبات نشره)، تعليقاته ومرفقاته، تسجيلاته وتخصيصاته، ثم الحساب نفسه.
  const privateFiles = await prisma.enrichmentFile.findMany({ where: { teacherId }, select: { id: true } });
  await prisma.$transaction([
    prisma.appSetting.deleteMany({ where: { key: { in: privateFiles.map((f) => `enrich-req:${f.id}`) } } }),
    prisma.enrichmentFile.deleteMany({ where: { teacherId } }),
    // المعتمَد العامّ الذي رفعه يبقى منشوراً: تُنقل ملكية الرفع للمدير المنفِّذ (وsourceTeacherId يُصفَّر تلقائياً).
    prisma.enrichmentFile.updateMany({ where: { uploadedById: teacherId }, data: { uploadedById: actorId } }),
    prisma.annotation.deleteMany({ where: { authorId: teacherId } }),
    prisma.attachment.deleteMany({ where: { uploadedById: teacherId } }),
    prisma.teacherSubject.deleteMany({ where: { teacherId } }),
    prisma.studentEnrollment.deleteMany({ where: { teacherId } }),
    prisma.quizAssignment.deleteMany({ where: { teacherId } }),
    prisma.user.updateMany({ where: { createdById: teacherId }, data: { createdById: null } }),
    prisma.teacherProfile.deleteMany({ where: { userId: teacherId } }),
    prisma.user.delete({ where: { id: teacherId } }),
  ]);

  // مدرّس مستقلّ: مؤسّسته الخاصّة تُحذف إن لم يبقَ بها مستخدمون.
  if (meta.teacherProfile?.isIndependent && meta.schoolId) {
    const remaining = await prisma.user.count({ where: { schoolId: meta.schoolId } });
    if (remaining === 0) await prisma.school.delete({ where: { id: meta.schoolId } }).catch(() => {});
  }
  return { done: true, progress };
}
