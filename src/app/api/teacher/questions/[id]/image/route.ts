// src/app/api/teacher/questions/[id]/image/route.ts
// POST: رفع صورة سؤال توسيم الرسم (تستبدل الموجودة). DELETE: حذفها. المدرّس المالك فقط.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTeacherSession } from "@/lib/teacher";
import { readUpload, isAllowedMime } from "@/lib/attachments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ownedQuestion(teacherId: string, id: string) {
  const q = await prisma.question.findUnique({
    where: { id },
    select: { id: true, creatorId: true, isActive: true },
  });
  if (!q || q.creatorId !== teacherId || !q.isActive) return null;
  return q;
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getTeacherSession();
  if (!session) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }
  const q = await ownedQuestion(session.sub, params.id);
  if (!q) {
    return NextResponse.json({ error: "السؤال غير موجود" }, { status: 404 });
  }

  const form = await req.formData();
  const up = await readUpload(form);
  if (!up.ok) {
    return NextResponse.json({ error: up.error }, { status: 422 });
  }
  // صورة فقط (لا PDF) لتوسيم الرسم.
  if (!up.mimeType.startsWith("image/") || !isAllowedMime(up.mimeType)) {
    return NextResponse.json(
      { error: "ارفع صورة (JPEG/PNG/WebP)." },
      { status: 422 }
    );
  }

  // استبدال أي صورة سابقة لهذا السؤال.
  await prisma.$transaction(async (tx) => {
    await tx.attachment.deleteMany({
      where: { questionId: q.id, kind: "QUESTION_IMAGE" },
    });
    await tx.attachment.create({
      data: {
        kind: "QUESTION_IMAGE",
        mimeType: up.mimeType,
        sizeBytes: up.size,
        data: up.buffer,
        uploadedById: session.sub,
        questionId: q.id,
      },
    });
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getTeacherSession();
  if (!session) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }
  const q = await ownedQuestion(session.sub, params.id);
  if (!q) {
    return NextResponse.json({ error: "السؤال غير موجود" }, { status: 404 });
  }
  await prisma.attachment.deleteMany({
    where: { questionId: q.id, kind: "QUESTION_IMAGE" },
  });
  return NextResponse.json({ ok: true });
}
