// src/app/api/teacher/quizzes/[id]/assign-by-code/route.ts
// POST: إسناد الاختبار لطلاب عبر رموزهم (ضمن مؤسّسة المدرّس)، أيّاً كانت مادتهم/صفّهم.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTeacherSession } from "@/lib/teacher";
import { ownedQuiz } from "@/lib/teacherQuiz";
import { createNotifications } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ codes: z.string().min(1, "أدخل رموز الطلاب") });

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
      { error: "انشر الاختبار قبل الإسناد" },
      { status: 409 }
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 }
    );
  }
  const codes = Array.from(
    new Set(
      parsed.data.codes
        .split(/[\s,،]+/)
        .map((c) => c.trim())
        .filter(Boolean)
    )
  );

  const teacher = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { schoolId: true },
  });

  const assigned: string[] = [];
  const notFound: string[] = [];
  const otherSchool: string[] = [];
  const newStudentIds: string[] = [];

  for (const code of codes) {
    const profile = await prisma.studentProfile.findUnique({
      where: { studentCode: code },
      select: { user: { select: { id: true, schoolId: true } } },
    });
    if (!profile) {
      notFound.push(code);
      continue;
    }
    // العزل: كلا الطرفين لهما مؤسّسة وهي نفسها (يمنع تسرّب null===null).
    if (!teacher?.schoolId || profile.user.schoolId !== teacher.schoolId) {
      otherSchool.push(code);
      continue;
    }
    const existing = await prisma.quizAssignment.findFirst({
      where: { quizId: quiz.id, studentId: profile.user.id },
      select: { id: true },
    });
    if (!existing) {
      await prisma.quizAssignment.create({
        data: {
          quizId: quiz.id,
          studentId: profile.user.id,
          teacherId: session.sub,
        },
      });
      newStudentIds.push(profile.user.id);
    }
    assigned.push(code);
  }

  // إشعار الطلاب المُسنَد إليهم حديثاً.
  await createNotifications(
    newStudentIds.map((studentId) => ({
      userId: studentId,
      type: "ASSIGNED",
      message: `أُسنِد إليك اختبار «${quiz.title}»`,
      linkUrl: `/student/quizzes/${quiz.id}`,
    })),
  );

  return NextResponse.json({ assigned, notFound, otherSchool });
}
