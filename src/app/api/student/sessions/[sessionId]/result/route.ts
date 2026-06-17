// src/app/api/student/sessions/[sessionId]/result/route.ts
// GET: نتيجة الجلسة ومراجعتها كاملةً — تُكشف الإجابات الصحيحة بعد الانتهاء فقط.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession, getSessionReview } from "@/lib/exam";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { sessionId: string } }
) {
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }

  // فحص الملكية والحالة قبل بناء المراجعة.
  const exam = await prisma.examSession.findUnique({
    where: { id: params.sessionId },
    select: { studentId: true, status: true },
  });
  if (!exam || exam.studentId !== session.sub) {
    return NextResponse.json({ error: "الجلسة غير موجودة" }, { status: 404 });
  }
  if (exam.status === "IN_PROGRESS") {
    return NextResponse.json({ error: "الجلسة لم تنتهِ بعد" }, { status: 409 });
  }

  const review = await getSessionReview(params.sessionId);
  if (!review) {
    return NextResponse.json({ error: "الجلسة غير موجودة" }, { status: 404 });
  }
  return NextResponse.json(review);
}
