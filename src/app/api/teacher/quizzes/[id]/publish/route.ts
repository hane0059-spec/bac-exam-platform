// src/app/api/teacher/quizzes/[id]/publish/route.ts
// POST: نشر الاختبار أو إلغاء نشره.
import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getTeacherSession } from "@/lib/teacher";
import { ownedQuiz, nextAccessCode } from "@/lib/teacherQuiz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ action: z.enum(["publish", "unpublish"]) });

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

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "إجراء غير صالح" }, { status: 400 });
  }

  if (parsed.data.action === "publish") {
    if (quiz.isFileBased) {
      // الاختبار الورقي: يلزم رفع ملف الاختبار قبل النشر.
      const hasFile = await prisma.attachment.count({
        where: { quizId: quiz.id, kind: "EXAM_FILE" },
      });
      if (hasFile < 1) {
        return NextResponse.json(
          { error: "ارفع ملف الاختبار قبل النشر" },
          { status: 422 }
        );
      }
    } else {
      const questionCount = await prisma.quizNode.count({
        where: { quizId: quiz.id, nodeType: "QUESTION" },
      });
      if (questionCount < 1) {
        return NextResponse.json(
          { error: "أضف سؤالاً واحداً على الأقل قبل النشر" },
          { status: 422 }
        );
      }
    }
    // توليد رمز تسلسلي فريد عند أوّل نشر (يثبت بعدها).
    if (quiz.accessCode) {
      await prisma.quiz.update({
        where: { id: quiz.id },
        data: { status: "PUBLISHED" },
      });
      return NextResponse.json({ status: "PUBLISHED", accessCode: quiz.accessCode });
    }
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = await nextAccessCode();
      try {
        await prisma.quiz.update({
          where: { id: quiz.id },
          data: { status: "PUBLISHED", accessCode: code },
        });
        return NextResponse.json({ status: "PUBLISHED", accessCode: code });
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === "P2002"
        ) {
          continue;
        }
        throw e;
      }
    }
    return NextResponse.json(
      { error: "تعذّر توليد رمز فريد، حاول مجدداً" },
      { status: 500 }
    );
  }

  // إلغاء النشر: ممكن فقط إن لم توجد جلسات.
  const sessions = await prisma.examSession.count({
    where: { quizId: quiz.id },
  });
  if (sessions > 0) {
    return NextResponse.json(
      { error: "لا يمكن إلغاء النشر بعد بدء الطلاب الأداء" },
      { status: 409 }
    );
  }
  await prisma.quiz.update({
    where: { id: quiz.id },
    data: { status: "DRAFT" },
  });
  return NextResponse.json({ status: "DRAFT" });
}
