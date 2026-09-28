// src/app/api/teacher/quizzes/generate/route.ts
// POST: يولّد 1–7 نماذج اختبار تلقائياً من بنك المدرّس (توازن أنواع الأسئلة +
// درجة كلية محدَّدة)، كمسوّدات عادية قابلة للمراجعة اليدوية في الباني قبل النشر.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTeacherSession, teacherTeachesSubject } from "@/lib/teacher";
import { rebuildQuizGraph } from "@/lib/teacherQuiz";
import {
  generateRequestSchema,
  checkRequirements,
  generateModels,
  TYPE_LABEL,
} from "@/lib/quizGenerator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getTeacherSession();
  if (!session) return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const parsed = generateRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 }
    );
  }
  const d = parsed.data;

  if (!(await teacherTeachesSubject(session.sub, d.subjectId))) {
    return NextResponse.json({ error: "لا تملك صلاحية على هذه المادة" }, { status: 403 });
  }

  const shortfalls = await checkRequirements(session.sub, d.subjectId, d.scope, d.requirements);
  if (shortfalls.length > 0) {
    const msg = shortfalls
      .map((s) => `${TYPE_LABEL[s.type] ?? s.type}: طلبت ${s.requested} والمتاح ${s.available}`)
      .join(" · ");
    return NextResponse.json(
      { error: `البنك لا يكفي لبعض الأنواع — ${msg}` },
      { status: 400 }
    );
  }

  const models = await generateModels({
    teacherId: session.sub,
    subjectId: d.subjectId,
    scope: d.scope,
    requirements: d.requirements,
    targetTotal: d.targetTotal,
    modelsCount: d.modelsCount,
    baseTitle: d.title,
  });

  const created: { id: string; title: string }[] = [];
  await prisma.$transaction(
    async (tx) => {
      for (const model of models) {
        const quiz = await tx.quiz.create({
          data: {
            creatorId: session.sub,
            subjectId: d.subjectId,
            title: model.title,
            mode: "LINEAR",
            status: "DRAFT",
            settings: {
              timeLimitSec: 600,
              maxAttempts: 1,
              revealAnswers: "immediate",
            },
          },
          select: { id: true, title: true },
        });
        await rebuildQuizGraph(tx, quiz.id, model.items);
        created.push(quiz);
      }
    },
    { timeout: 60000, maxWait: 15000 }
  );

  return NextResponse.json({ quizzes: created }, { status: 201 });
}
