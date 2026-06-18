// src/app/api/teacher/quizzes/[id]/assignments/route.ts
// POST: إسناد الاختبار لطلاب (إضافة/تحديث موعد). DELETE: إلغاء إسناد طالب.
// القاعدة: اختبار منشور يملكه المدرّس، وطلاب مسجّلون معه في مادته.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTeacherSession } from "@/lib/teacher";
import { ownedQuiz } from "@/lib/teacherQuiz";
import { createNotifications } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const postSchema = z.object({
  studentIds: z.array(z.string().min(1)).min(1, "اختر طالباً واحداً على الأقل"),
  dueDate: z.string().datetime().nullable().optional(),
});

/** معرّفات طلاب مسجّلين مع هذا المدرّس في مادة الاختبار. */
async function enrolledStudentIds(
  teacherId: string,
  subjectId: string
): Promise<Set<string>> {
  const rows = await prisma.studentEnrollment.findMany({
    where: { teacherId, subjectId, isActive: true },
    select: { studentId: true },
  });
  return new Set(rows.map((r) => r.studentId));
}

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
      { error: "انشر الاختبار قبل إسناده" },
      { status: 409 }
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const parsed = postSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 }
    );
  }
  const { studentIds, dueDate } = parsed.data;

  // الملكية: كل الطلاب مسجّلون مع المدرّس في مادة الاختبار.
  const allowed = await enrolledStudentIds(session.sub, quiz.subjectId);
  const targets = studentIds.filter((id) => allowed.has(id));
  if (targets.length === 0) {
    return NextResponse.json(
      { error: "لا طلاب صالحون للإسناد" },
      { status: 400 }
    );
  }

  const due = dueDate ? new Date(dueDate) : null;
  const existing = await prisma.quizAssignment.findMany({
    where: { quizId: quiz.id, studentId: { in: targets } },
    select: { id: true, studentId: true },
  });
  const existingByStudent = new Map(existing.map((e) => [e.studentId, e.id]));

  await prisma.$transaction(
    targets.map((studentId) => {
      const found = existingByStudent.get(studentId);
      return found
        ? prisma.quizAssignment.update({
            where: { id: found },
            data: { dueDate: due },
          })
        : prisma.quizAssignment.create({
            data: {
              quizId: quiz.id,
              studentId,
              teacherId: session.sub,
              dueDate: due,
            },
          });
    })
  );

  // إشعار الطلاب المُسنَد إليهم حديثاً فقط (لا عند تحديث الموعد).
  const newStudents = targets.filter((id) => !existingByStudent.has(id));
  await createNotifications(
    newStudents.map((studentId) => ({
      userId: studentId,
      type: "ASSIGNED",
      message: `أُسنِد إليك اختبار «${quiz.title}»`,
      linkUrl: `/student/quizzes/${quiz.id}`,
    })),
  );

  return NextResponse.json({ assigned: targets.length });
}

export async function DELETE(
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
  const studentId = new URL(req.url).searchParams.get("studentId");
  if (!studentId) {
    return NextResponse.json({ error: "طالب غير محدّد" }, { status: 400 });
  }

  // لا يُلغى الإسناد أثناء جلسة جارية للطالب (حفاظاً على أدائه).
  const inProgress = await prisma.examSession.count({
    where: { quizId: quiz.id, studentId, status: "IN_PROGRESS" },
  });
  if (inProgress > 0) {
    return NextResponse.json(
      { error: "الطالب يؤدّي الاختبار حالياً — لا يمكن إلغاء الإسناد" },
      { status: 409 }
    );
  }

  await prisma.quizAssignment.deleteMany({
    where: { quizId: quiz.id, studentId },
  });
  return NextResponse.json({ ok: true });
}
