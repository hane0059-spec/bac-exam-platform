// src/app/api/student/sessions/[sessionId]/answer/route.ts
// POST: استقبال إجابة، تصحيحها على الخادم، إنشاء سجلّ الإجابة، والتقدّم للسؤال التالي.
// تصحيح فوري: تُعاد صحّة الإجابة والشرح بعد كل سؤال (دون كشفها قبل الإرسال).
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  gradeOptionAnswer,
  gradeShortAnswer,
  gradeOrderAnswer,
  gradeFillBlank,
  parseBlankAnswers,
} from "@/lib/grading";
import {
  getStudentSession,
  parseSettings,
  isExpired,
  finalizeSession,
  nextUnansweredNodeId,
  loadSanitizedQuestion,
  countQuestionNodes,
  attemptSeed,
} from "@/lib/exam";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  nodeId: z.string().min(1),
  optionIds: z.array(z.string()).optional().default([]),
  textAnswer: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: { sessionId: string } }
) {
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }
  const { nodeId, optionIds, textAnswer } = parsed.data;

  const exam = await prisma.examSession.findUnique({
    where: { id: params.sessionId },
    include: { quiz: true },
  });
  // الملكية: الجلسة تخصّ هذا الطالب.
  if (!exam || exam.studentId !== session.sub) {
    return NextResponse.json({ error: "الجلسة غير موجودة" }, { status: 404 });
  }
  if (exam.status !== "IN_PROGRESS") {
    return NextResponse.json(
      { error: "انتهت هذه الجلسة" },
      { status: 409 }
    );
  }

  const settings = parseSettings(exam.quiz.settings);

  // فرض المهلة على الخادم.
  if (isExpired(exam.startedAt, settings.timeLimitSec)) {
    await finalizeSession(exam.id, "TIMED_OUT");
    return NextResponse.json({ finished: true, expired: true });
  }

  // يجب أن يُجاب السؤال الحالي فقط (لا تقديم/تكرار).
  if (exam.currentNodeId !== nodeId) {
    return NextResponse.json(
      { error: "هذا ليس السؤال الحالي" },
      { status: 409 }
    );
  }
  const already = await prisma.studentAnswer.findFirst({
    where: { sessionId: exam.id, nodeId },
    select: { id: true },
  });
  if (already) {
    return NextResponse.json(
      { error: "أُجيب هذا السؤال سابقاً" },
      { status: 409 }
    );
  }

  const node = await prisma.quizNode.findUnique({
    where: { id: nodeId },
    include: {
      question: { include: { options: { orderBy: { orderNum: "asc" } } } },
    },
  });
  if (!node || !node.question || node.quizId !== exam.quizId) {
    return NextResponse.json({ error: "سؤال غير صالح" }, { status: 404 });
  }
  const q = node.question;
  const points = Number(node.pointsOverride ?? q.points);

  // التصحيح على الخادم.
  let isCorrect: boolean;
  let connectOptionIds: string[] = [];
  let storedText: string | null = textAnswer ?? null;
  // الدرجة الجزئية (تُستعمل لملء الفراغات)؛ null = حساب ثنائي افتراضي.
  let partialEarned: number | null = null;
  // ملء الفراغات: تُعتمد فوراً إن كانت كلّها صحيحة، وإلا تُحال لمراجعة المدرّس.
  let fillNeedsReview = false;
  if (q.type === "MULTIPLE_CHOICE" || q.type === "TRUE_FALSE") {
    const correctIds = q.options.filter((o) => o.isCorrect).map((o) => o.id);
    const validSelected = optionIds.filter((id) =>
      q.options.some((o) => o.id === id)
    );
    connectOptionIds = validSelected;
    isCorrect = gradeOptionAnswer(correctIds, validSelected);
  } else if (q.type === "ORDER") {
    // التسلسل الصحيح = الخيارات مرتّبةً بـ orderNum؛ إجابة الطالب تسلسل المعرّفات.
    const correctIds = [...q.options]
      .sort((a, b) => a.orderNum - b.orderNum)
      .map((o) => o.id);
    const valid = optionIds.filter((id) => q.options.some((o) => o.id === id));
    const isPermutation =
      valid.length === correctIds.length &&
      new Set(valid).size === correctIds.length;
    connectOptionIds = isPermutation ? valid : [];
    isCorrect = isPermutation && gradeOrderAnswer(correctIds, valid);
    // نخزّن تسلسل الطالب في النصّ (للمراجعة، لأن العلاقة مجموعة بلا ترتيب).
    storedText = (isPermutation ? valid : optionIds).join(",");
  } else if (q.type === "SHORT_ANSWER") {
    isCorrect = gradeShortAnswer(q.acceptedAnswers, textAnswer ?? "");
  } else if (q.type === "FILL_BLANK") {
    // كل خيار = فراغ (مرتّباً بـ orderNum)، ومحتواه إجاباته المقبولة مفصولةً بـ |.
    const blanks = [...q.options]
      .sort((a, b) => a.orderNum - b.orderNum)
      .map((o) => parseBlankAnswers(o.content));
    let studentArr: string[] = [];
    try {
      const parsed = JSON.parse(textAnswer ?? "[]");
      if (Array.isArray(parsed)) {
        studentArr = parsed.map((s) => (typeof s === "string" ? s : ""));
      }
    } catch {
      studentArr = [];
    }
    const { correctCount, total } = gradeFillBlank(blanks, studentArr);
    isCorrect = total > 0 && correctCount === total;
    // درجة جزئية بنسبة الفراغات الصحيحة، مقرّبة لمنزلتين.
    partialEarned =
      total > 0 ? Math.round((points * correctCount) / total * 100) / 100 : 0;
    // كلّها صحيحة → نتيجة فورية؛ وجود أي فراغ خاطئ (قد يكون مرادفاً غير مُدرَج)
    // → مراجعة المدرّس.
    fillNeedsReview = correctCount < total;
    // نخزّن إجابات الطالب مصفوفةً (للمراجعة)؛ بطول الفراغات.
    storedText = JSON.stringify(
      Array.from({ length: total }, (_, i) => studentArr[i] ?? "")
    );
  } else {
    // المقالي لا يُصحَّح آلياً — يُترك للمدرّس.
    isCorrect = false;
  }
  // القصيرة (تصحيح أوّلي) والمقالي تخضع لمراجعة المدرّس دائماً؛ وملء الفراغات
  // فقط عند عدم تطابق كل الفراغات (إجابة محتملة خارج الاحتمالات المُدرَجة).
  const needsReview =
    q.type === "SHORT_ANSWER" ||
    q.type === "ESSAY" ||
    (q.type === "FILL_BLANK" && fillNeedsReview);
  const scoreEarned =
    partialEarned != null ? partialEarned : isCorrect ? points : 0;

  // عقدة السؤال التالية (أو النهاية).
  // كتابة الإجابة وتسجيل المسار في معاملة واحدة.
  await prisma.$transaction([
    prisma.studentAnswer.create({
      data: {
        sessionId: exam.id,
        questionId: q.id,
        nodeId,
        textAnswer: storedText,
        isCorrect,
        scoreEarned,
        needsReview,
        selectedOptions: connectOptionIds.length
          ? { connect: connectOptionIds.map((id) => ({ id })) }
          : undefined,
      },
    }),
    prisma.examSession.update({
      where: { id: exam.id },
      data: { pathTaken: { push: nodeId } },
    }),
  ]);

  // بذرة الخلط (إن كان مفعّلاً) — ثابتة لهذه المحاولة.
  const seed = settings.shuffle
    ? attemptSeed(exam.studentId, exam.quizId, exam.attemptNumber)
    : undefined;

  // السؤال غير المُجاب التالي (يلتفّ للأسئلة المتخطّاة في آخر الاختبار).
  const nextNode = await nextUnansweredNodeId(
    exam.quizId,
    exam.id,
    nodeId,
    false,
    seed
  );
  const finished = nextNode === null;

  if (finished) {
    await finalizeSession(exam.id, "COMPLETED");
  } else {
    await prisma.examSession.update({
      where: { id: exam.id },
      data: { currentNodeId: nextNode },
    });
  }

  // كشف التصحيح الفوري فقط إن لم يكن وضع الكشف «في نهاية الاختبار».
  // في وضع «end» لا تُرسَل أي بيانات تصحيح للمتصفّح أثناء الأداء.
  // الأسئلة الخاضعة للمراجعة تُظهر «بانتظار المدرّس» لا تصحيحاً نهائياً.
  const reveal =
    settings.revealAnswers === "end"
      ? null
      : needsReview
      ? {
          needsReview: true,
          isCorrect: false,
          scoreEarned: 0,
          points,
          explanation: null,
          correctOptions: [],
          acceptedAnswers: [],
        }
      : {
          needsReview: false,
          isCorrect,
          scoreEarned,
          points,
          explanation: q.explanation ?? null,
          correctOptions:
            q.type === "MULTIPLE_CHOICE" || q.type === "TRUE_FALSE"
              ? q.options
                  .filter((o) => o.isCorrect)
                  .map((o) => ({ id: o.id, label: o.label, content: o.content }))
              : q.type === "ORDER"
              ? [...q.options]
                  .sort((a, b) => a.orderNum - b.orderNum)
                  .map((o) => ({ id: o.id, label: o.label, content: o.content }))
              : [],
          acceptedAnswers: [],
        };

  if (finished) {
    return NextResponse.json({ reveal, finished: true });
  }

  const total = await countQuestionNodes(exam.quizId);
  const answered = await prisma.studentAnswer.count({
    where: { sessionId: exam.id },
  });
  const next = await loadSanitizedQuestion(
    nextNode!,
    answered + 1,
    total,
    seed ? `${seed}:${nextNode}` : undefined
  );
  return NextResponse.json({ reveal, finished: false, next });
}
