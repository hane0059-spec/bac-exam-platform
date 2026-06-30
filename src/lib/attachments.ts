// src/lib/attachments.ts
// طبقة تجريد التخزين (حالياً داخل Postgres) + تحقّق الرفع + فحص ملكية البثّ.
// التجريد يسهّل الترحيل لاحقاً لمزوّد خارجي بتغيير هذا الملف فقط.
import { prisma } from "@/lib/prisma";
import type { SessionData } from "@/lib/auth";

export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024; // 3MB
export const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export function isAllowedMime(m: string): boolean {
  return (ALLOWED_MIME as readonly string[]).includes(m);
}

/** يقرأ ملفاً من FormData ويتحقّق من نوعه وحجمه. */
export async function readUpload(
  form: FormData,
  field = "file",
): Promise<
  | { ok: true; buffer: Buffer; mimeType: string; size: number }
  | { ok: false; error: string }
> {
  const file = form.get(field);
  if (!(file instanceof File)) return { ok: false, error: "لا ملف مرفوع." };
  if (!isAllowedMime(file.type))
    return { ok: false, error: "النوع غير مدعوم (صورة أو PDF فقط)." };
  if (file.size > MAX_UPLOAD_BYTES)
    return { ok: false, error: "حجم الملف يتجاوز 3 ميغابايت." };
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length === 0) return { ok: false, error: "ملف فارغ." };
  return { ok: true, buffer, mimeType: file.type, size: buffer.length };
}

interface AttachmentRef {
  kind: string;
  quizId: string | null;
  sessionId: string | null;
  questionId: string | null;
  uploadedById: string;
}

/** فحص ملكية صارم لبثّ المرفق (خصوصية القُصّر). */
export async function canAccessAttachment(
  session: SessionData,
  att: AttachmentRef,
): Promise<boolean> {
  if (att.uploadedById === session.sub) return true; // الرافِع دائماً

  // صورة سؤال توسيم الرسم: المدرّس المالك، أو طالب مُسنَد/له جلسة على اختبار يضمّ السؤال.
  if (att.kind === "QUESTION_IMAGE" && att.questionId) {
    const q = await prisma.question.findUnique({
      where: { id: att.questionId },
      select: { creatorId: true },
    });
    if (q?.creatorId === session.sub) return true;
    if (session.role === "STUDENT") {
      const node = await prisma.quizNode.findFirst({
        where: {
          questionId: att.questionId,
          quiz: {
            OR: [
              { assignments: { some: { studentId: session.sub } } },
              { sessions: { some: { studentId: session.sub } } },
            ],
          },
        },
        select: { id: true },
      });
      if (node) return true;
    }
    return false;
  }

  if (att.kind === "EXAM_FILE" && att.quizId) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: att.quizId },
      select: { creatorId: true },
    });
    if (quiz?.creatorId === session.sub) return true; // المدرّس المالك
    if (session.role === "STUDENT") {
      // طالب مُسنَد إليه الاختبار أو له جلسة عليه (بالتوازي).
      const [a, s] = await Promise.all([
        prisma.quizAssignment.findFirst({
          where: { quizId: att.quizId, studentId: session.sub },
          select: { id: true },
        }),
        prisma.examSession.findFirst({
          where: { quizId: att.quizId, studentId: session.sub },
          select: { id: true },
        }),
      ]);
      if (a || s) return true;
    }
    return false;
  }

  if (att.kind === "ANSWER_UPLOAD" && att.sessionId) {
    const exam = await prisma.examSession.findUnique({
      where: { id: att.sessionId },
      select: { studentId: true, quiz: { select: { creatorId: true } } },
    });
    if (!exam) return false;
    if (session.role === "STUDENT" && exam.studentId === session.sub)
      return true;
    if (session.role === "TEACHER" && exam.quiz.creatorId === session.sub)
      return true;
    if (session.role === "PARENT") {
      const link = await prisma.parentLink.findUnique({
        where: {
          parentId_studentId: {
            parentId: session.sub,
            studentId: exam.studentId,
          },
        },
        select: { id: true },
      });
      if (link) return true;
    }
    return false;
  }

  return false;
}
