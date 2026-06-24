// src/lib/teacherExport.ts
// تصدير «حزمة المدرّس» الكاملة كائناً قابلاً للتنزيل (والاستيراد لاحقاً) — قراءة فقط.
// يلتقط: الحساب والملف والمواد + الأسئلة (وخياراتها/أزواجها) + الاختبارات (وعقدها/حوافها)
// + الطلاب الذين أنشأهم (وملفّهم وتسجيلاتهم) + جلسات اختباراته وإجاباتها + كل المرفقات base64.
import { prisma } from "@/lib/prisma";

export const TEACHER_EXPORT_FORMAT = "bac-teacher-export";
export const TEACHER_EXPORT_VERSION = 1;

export interface TeacherExportMeta {
  format: string;
  version: number;
  exportedAt: string;
  teacherId: string;
  counts: Record<string, number>;
  totalAttachmentBytes: number;
}

/** يبني حزمة تصدير كاملة لمدرّس. يفترض أن المتصل تحقّق من الصلاحية/الملكية. */
export async function buildTeacherExport(teacherId: string) {
  const teacher = await prisma.user.findUnique({
    where: { id: teacherId },
    include: {
      teacherProfile: true,
      teacherSubjects: {
        include: { subject: { select: { id: true, name: true, code: true } } },
      },
    },
  });
  if (!teacher) throw new Error("المدرّس غير موجود");

  const [questions, quizzes, students] = await Promise.all([
    prisma.question.findMany({
      where: { creatorId: teacherId },
      include: { options: true, matchingPairs: true },
    }),
    prisma.quiz.findMany({
      where: { creatorId: teacherId },
      include: { nodes: true, edges: true },
    }),
    prisma.user.findMany({
      where: { createdById: teacherId, role: "STUDENT" },
      include: {
        studentProfile: true,
        studentEnrollments: {
          select: {
            teacherId: true,
            subjectId: true,
            academicYear: true,
            isActive: true,
          },
        },
      },
    }),
  ]);

  const quizIds = quizzes.map((q) => q.id);
  const questionIds = questions.map((q) => q.id);

  // جلسات اختبارات هذا المدرّس (نتائج طلابه فيها) + إجاباتها.
  const sessions = await prisma.examSession.findMany({
    where: { quizId: { in: quizIds } },
    include: {
      answers: {
        include: { selectedOptions: { select: { id: true } } },
      },
    },
  });
  const sessionIds = sessions.map((s) => s.id);

  // كل المرفقات المتّصلة بمحتوى المدرّس (صور أسئلته/ملفّاته + أوراق إجابات جلساته).
  const attachments = await prisma.attachment.findMany({
    where: {
      OR: [
        { uploadedById: teacherId },
        { questionId: { in: questionIds } },
        { quizId: { in: quizIds } },
        { sessionId: { in: sessionIds } },
      ],
    },
    include: { annotations: true },
  });

  let totalAttachmentBytes = 0;
  const attachmentsOut = attachments.map((a) => {
    totalAttachmentBytes += a.sizeBytes;
    const { data, ...rest } = a;
    return { ...rest, dataBase64: Buffer.from(data).toString("base64") };
  });

  // طالبٌ «حصريّ» إن لم يكن له تسجيلٌ مع مدرّسٍ آخر (لمنطق الحذف لاحقاً).
  const studentsOut = students.map((s) => ({
    ...s,
    exclusiveToTeacher: s.studentEnrollments.every(
      (e) => e.teacherId === teacherId
    ),
  }));

  const meta: TeacherExportMeta = {
    format: TEACHER_EXPORT_FORMAT,
    version: TEACHER_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    teacherId,
    counts: {
      questions: questions.length,
      quizzes: quizzes.length,
      students: students.length,
      sessions: sessions.length,
      attachments: attachments.length,
    },
    totalAttachmentBytes,
  };

  return {
    meta,
    teacher,
    questions,
    quizzes,
    students: studentsOut,
    sessions,
    attachments: attachmentsOut,
  };
}
