// src/app/api/admin/external-import/route.ts
// POST: استيراد طلاب خارجيين من ملف (CSV/xlsx) وإسناد اختبار اختيارياً. (المدير حصراً.)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin";
import { runExternalImport } from "@/lib/externalImportService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const file = form.get("file");
  const quizId = String(form.get("quizId") ?? "");
  const defaultGradeId = String(form.get("defaultGradeId") ?? "");
  if (!(file instanceof Blob) || !defaultGradeId) {
    return NextResponse.json(
      { error: "الملف والصفّ الافتراضي مطلوبان" },
      { status: 400 }
    );
  }

  // الإسناد اختياري: إن اختير اختبار وجب أن يكون منشوراً.
  let quiz: { id: string; creatorId: string; title: string } | null = null;
  if (quizId) {
    const q = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!q || q.status !== "PUBLISHED") {
      return NextResponse.json(
        { error: "الاختبار المختار غير منشور" },
        { status: 400 }
      );
    }
    quiz = { id: q.id, creatorId: q.creatorId, title: q.title };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = (file as File).name ?? "upload.csv";
  const res = await runExternalImport({
    buffer,
    filename,
    defaultGradeId,
    createdById: session.sub,
    quiz: quiz ? { id: quiz.id, creatorId: quiz.creatorId } : null,
  });
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: 400 });
  }

  return NextResponse.json({
    quizTitle: quiz ? quiz.title : "بدون إسناد (دخول بالرمز)",
    ...res.result,
  });
}
