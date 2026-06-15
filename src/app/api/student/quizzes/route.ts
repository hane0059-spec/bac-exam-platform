// src/app/api/student/quizzes/route.ts
// GET: قائمة الاختبارات المنشورة المُسنَدة للطالب مع حالتها.
import { NextResponse } from "next/server";
import { getStudentSession, listStudentQuizzes } from "@/lib/exam";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }
  const quizzes = await listStudentQuizzes(session.sub);
  return NextResponse.json({ quizzes });
}
