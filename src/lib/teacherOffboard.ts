// src/lib/teacherOffboard.ts
// مغادرة المدرّس (بعد تصدير حزمته): تحرير التخزين دون فقدان السجلّات النصّية.
// - حذف المرفقات الثقيلة فقط (مرفقاته + أوراق جلسات اختباراته + مرفقات طلابه الحصريّين).
// - تعطيل حساب المدرّس (لا حذف؛ تبقى أسئلته/اختباراته/الدرجات قشوراً نصّية رخيصة).
// - تعطيل قيد طلابه في مادته فقط؛ والطالب المسجَّل بمواد أخرى يبقى نشطاً،
//   ويُعطَّل حسابه كلّياً فقط إن لم يبقَ له قيدٌ نشطٌ مع مدرّس آخر (حصريّ).
import { prisma } from "@/lib/prisma";

export interface OffboardResult {
  deactivatedStudents: number; // طلاب عُطّلوا كلّياً (حصريّون)
  keptStudents: number; // طلاب بقوا نشطين (لهم مواد أخرى)
  deletedAttachments: number;
  freedBytes: number;
}

/** ينفّذ مغادرة المدرّس. يفترض أن المتصل تحقّق من الصلاحية/الملكية. */
export async function offboardTeacher(teacherId: string): Promise<OffboardResult> {
  return prisma.$transaction(async (tx) => {
    // 1) تعطيل حساب المدرّس.
    await tx.user.update({
      where: { id: teacherId },
      data: { isActive: false },
    });

    // 2) تعطيل قيد طلابه معه (مادته فقط).
    await tx.studentEnrollment.updateMany({
      where: { teacherId },
      data: { isActive: false },
    });

    // 3) طلابه الذين أنشأهم، وتمييز الحصريّ (بلا قيدٍ نشطٍ متبقٍّ).
    const students = await tx.user.findMany({
      where: { createdById: teacherId, role: "STUDENT" },
      select: { id: true },
    });
    const studentIds = students.map((s) => s.id);

    const stillEnrolled =
      studentIds.length > 0
        ? await tx.studentEnrollment.findMany({
            where: { studentId: { in: studentIds }, isActive: true },
            distinct: ["studentId"],
            select: { studentId: true },
          })
        : [];
    const keptSet = new Set(stillEnrolled.map((e) => e.studentId));
    const exclusiveIds = studentIds.filter((id) => !keptSet.has(id));

    if (exclusiveIds.length > 0) {
      await tx.user.updateMany({
        where: { id: { in: exclusiveIds } },
        data: { isActive: false },
      });
    }

    // 4) المرفقات الثقيلة المراد تحريرها: محتوى المدرّس + مرفقات طلابه الحصريّين.
    const [quizzes, questions] = await Promise.all([
      tx.quiz.findMany({ where: { creatorId: teacherId }, select: { id: true } }),
      tx.question.findMany({
        where: { creatorId: teacherId },
        select: { id: true },
      }),
    ]);
    const quizIds = quizzes.map((q) => q.id);
    const sessions = await tx.examSession.findMany({
      where: { quizId: { in: quizIds } },
      select: { id: true },
    });

    const attWhere = {
      OR: [
        { uploadedById: teacherId },
        { uploadedById: { in: exclusiveIds } },
        { questionId: { in: questions.map((q) => q.id) } },
        { quizId: { in: quizIds } },
        { sessionId: { in: sessions.map((s) => s.id) } },
      ],
    };

    const agg = await tx.attachment.aggregate({
      where: attWhere,
      _sum: { sizeBytes: true },
      _count: { _all: true },
    });
    await tx.attachment.deleteMany({ where: attWhere });

    return {
      deactivatedStudents: exclusiveIds.length,
      keptStudents: keptSet.size,
      deletedAttachments: agg._count._all,
      freedBytes: agg._sum.sizeBytes ?? 0,
    };
  });
}
