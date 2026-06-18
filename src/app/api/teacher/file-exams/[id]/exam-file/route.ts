// src/app/api/teacher/file-exams/[id]/exam-file/route.ts
// POST: رفع/استبدال ملف الاختبار (صورة/PDF). المدرّس المالك حصراً.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTeacherSession } from "@/lib/teacher";
import { ownedQuiz } from "@/lib/teacherQuiz";
import { readUpload } from "@/lib/attachments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getTeacherSession();
  if (!session)
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });

  const quiz = await ownedQuiz(session.sub, params.id);
  if (!quiz || !quiz.isFileBased) {
    return NextResponse.json({ error: "الاختبار غير موجود" }, { status: 404 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const up = await readUpload(form);
  if (!up.ok) return NextResponse.json({ error: up.error }, { status: 400 });

  // استبدال الملف القديم (ملف اختبار واحد لكل اختبار).
  await prisma.$transaction([
    prisma.attachment.deleteMany({
      where: { quizId: quiz.id, kind: "EXAM_FILE" },
    }),
    prisma.attachment.create({
      data: {
        kind: "EXAM_FILE",
        mimeType: up.mimeType,
        sizeBytes: up.size,
        data: up.buffer,
        uploadedById: session.sub,
        quizId: quiz.id,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
