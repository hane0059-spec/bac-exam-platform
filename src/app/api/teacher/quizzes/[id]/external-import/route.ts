// src/app/api/teacher/quizzes/[id]/external-import/route.ts
// POST: إسناد خارجي بملف لاختبار المدرّس المنشور (يُنشئ حسابات ويُسندها).
import { NextResponse } from "next/server";
import { getTeacherSession } from "@/lib/teacher";
import { ownedQuiz } from "@/lib/teacherQuiz";
import { runExternalImport } from "@/lib/externalImportService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getTeacherSession();
  if (!session) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }
  const quiz = await ownedQuiz(session.sub, params.id);
  if (!quiz) {
    return NextResponse.json({ error: "الاختبار غير موجود" }, { status: 404 });
  }
  if (quiz.status !== "PUBLISHED") {
    return NextResponse.json(
      { error: "انشر الاختبار قبل الإسناد الخارجي" },
      { status: 409 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const file = form.get("file");
  const defaultGradeId = String(form.get("defaultGradeId") ?? "");
  if (!(file instanceof Blob) || !defaultGradeId) {
    return NextResponse.json(
      { error: "الملف والصفّ الافتراضي مطلوبان" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = (file as File).name ?? "upload.csv";
  const res = await runExternalImport({
    buffer,
    filename,
    defaultGradeId,
    createdById: session.sub,
    quiz: { id: quiz.id, creatorId: session.sub },
  });
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: 400 });
  }
  return NextResponse.json({ quizTitle: quiz.title, ...res.result });
}
