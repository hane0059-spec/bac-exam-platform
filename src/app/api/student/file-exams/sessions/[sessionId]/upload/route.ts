// src/app/api/student/file-exams/sessions/[sessionId]/upload/route.ts
// POST: رفع صورة صفحة إجابة. DELETE: حذف صفحة قبل الإرسال. الطالب صاحب الجلسة الجارية.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/exam";
import { readUpload } from "@/lib/attachments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PAGES = 12;

async function loadOwnInProgress(sessionId: string, studentId: string) {
  const exam = await prisma.examSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      studentId: true,
      status: true,
      quiz: { select: { isFileBased: true } },
    },
  });
  if (!exam || exam.studentId !== studentId || !exam.quiz.isFileBased)
    return null;
  return exam;
}

export async function POST(
  req: Request,
  { params }: { params: { sessionId: string } },
) {
  const session = await getStudentSession();
  if (!session)
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });

  const exam = await loadOwnInProgress(params.sessionId, session.sub);
  if (!exam)
    return NextResponse.json({ error: "الجلسة غير موجودة" }, { status: 404 });
  if (exam.status !== "IN_PROGRESS")
    return NextResponse.json({ error: "انتهت هذه المحاولة" }, { status: 409 });

  const count = await prisma.attachment.count({
    where: { sessionId: exam.id, kind: "ANSWER_UPLOAD" },
  });
  if (count >= MAX_PAGES)
    return NextResponse.json(
      { error: `الحد الأقصى ${MAX_PAGES} صفحات.` },
      { status: 409 },
    );

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const up = await readUpload(form);
  if (!up.ok) return NextResponse.json({ error: up.error }, { status: 400 });

  const att = await prisma.attachment.create({
    data: {
      kind: "ANSWER_UPLOAD",
      mimeType: up.mimeType,
      sizeBytes: up.size,
      data: up.buffer,
      uploadedById: session.sub,
      sessionId: exam.id,
    },
    select: { id: true },
  });
  return NextResponse.json({ ok: true, attachmentId: att.id });
}

const delSchema = z.object({ attachmentId: z.string().min(1) });

export async function DELETE(
  req: Request,
  { params }: { params: { sessionId: string } },
) {
  const session = await getStudentSession();
  if (!session)
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });

  const exam = await loadOwnInProgress(params.sessionId, session.sub);
  if (!exam)
    return NextResponse.json({ error: "الجلسة غير موجودة" }, { status: 404 });
  if (exam.status !== "IN_PROGRESS")
    return NextResponse.json({ error: "انتهت هذه المحاولة" }, { status: 409 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const parsed = delSchema.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });

  await prisma.attachment.deleteMany({
    where: {
      id: parsed.data.attachmentId,
      sessionId: exam.id,
      kind: "ANSWER_UPLOAD",
    },
  });
  return NextResponse.json({ ok: true });
}
