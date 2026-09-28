// src/app/api/teacher/quizzes/generate/counts/route.ts
// POST: عدد الأسئلة المتاحة لكل نوع ضمن مادة/نطاق منهج — لمعاينة حيّة في نموذج
// التوليد التلقائي قبل الإرسال (بلا كتابة).
import { NextResponse } from "next/server";
import { z } from "zod";
import { getTeacherSession, teacherTeachesSubject } from "@/lib/teacher";
import { countAvailableByType, scopeSchema } from "@/lib/quizGenerator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  subjectId: z.string().min(1),
  scope: scopeSchema,
});

export async function POST(req: Request) {
  const session = await getTeacherSession();
  if (!session) return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }
  if (!(await teacherTeachesSubject(session.sub, parsed.data.subjectId))) {
    return NextResponse.json({ error: "لا تملك صلاحية على هذه المادة" }, { status: 403 });
  }

  const counts = await countAvailableByType(session.sub, parsed.data.subjectId, parsed.data.scope);
  return NextResponse.json({ counts });
}
