// src/app/api/student/quizzes/[quizId]/start/route.ts
// POST: بدء جلسة أداء جديدة أو استئناف الجارية. وقت البدء من الخادم.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getStudentSession,
  parseSettings,
  isWithinWindow,
  firstQuestionNodeId,
  loadSanitizedQuestion,
  countQuestionNodes,
  remainingSeconds,
  isExpired,
  finalizeSession,
  attemptSeed,
  orderedQuestionNodeIds,
  loadPreviousAnswer,
  nextUnansweredNodeId,
} from "@/lib/exam";
import { withAdvisoryLock } from "@/lib/dbLock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, props: { params: Promise<{ quizId: string }> }) {
  return start(req, props, 0);
}

async function start(
  _req: Request,
  props: { params: Promise<{ quizId: string }> },
  depth: number
): Promise<NextResponse> {
  const params = await props.params;
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }
  const studentId = session.sub;
  const { quizId } = params;

  // الملكية: يجب أن يكون الاختبار مُسنَداً لهذا الطالب ومنشوراً.
  const assignment = await prisma.quizAssignment.findFirst({
    where: { quizId, studentId, quiz: { status: "PUBLISHED" } },
    include: { quiz: true },
  });
  if (!assignment) {
    return NextResponse.json(
      { error: "هذا الاختبار غير متاح لك" },
      { status: 404 }
    );
  }
  const quiz = assignment.quiz;
  const settings = parseSettings(quiz.settings);

  if (!isWithinWindow(quiz.availableFrom, quiz.availableUntil)) {
    return NextResponse.json(
      { error: "هذا الاختبار خارج نافذة الإتاحة" },
      { status: 403 }
    );
  }

  const total = await countQuestionNodes(quizId);

  // استئناف جلسة جارية إن وُجدت.
  const existing = await prisma.examSession.findFirst({
    where: { studentId, quizId, status: "IN_PROGRESS" },
    orderBy: { startedAt: "desc" },
  });

  if (existing) {
    // انتهت المهلة أثناء الغياب → إنهاء فوري.
    if (isExpired(existing.startedAt, settings.timeLimitSec)) {
      await finalizeSession(existing.id, "TIMED_OUT");
      return NextResponse.json({
        sessionId: existing.id,
        finished: true,
        expired: true,
      });
    }
    const answered = await prisma.studentAnswer.count({
      where: { sessionId: existing.id },
    });
    const seed = settings.shuffle
      ? attemptSeed(studentId, quizId, existing.attemptNumber)
      : undefined;
    // وضع المراجعة: الفهرس موضع السؤال في الترتيب، ومعه إجابته السابقة. وإن عُطِّلت المراجعة
    // أثناء جلسة جارية وكان السؤال الحالي مُجاباً ← انتقل لأوّل غير مُجاب (أو أنهِ).
    let currentNodeId = existing.currentNodeId;
    if (!settings.reviewBeforeSubmit && currentNodeId) {
      const done = await prisma.studentAnswer.findFirst({
        where: { sessionId: existing.id, nodeId: currentNodeId },
        select: { id: true },
      });
      if (done) {
        currentNodeId = await nextUnansweredNodeId(
          quizId,
          existing.id,
          currentNodeId,
          false,
          seed
        );
        if (currentNodeId === null) {
          await finalizeSession(existing.id, "COMPLETED");
          return NextResponse.json({ sessionId: existing.id, finished: true });
        }
        await prisma.examSession.update({
          where: { id: existing.id },
          data: { currentNodeId },
        });
      }
    }
    const ids = settings.reviewBeforeSubmit
      ? await orderedQuestionNodeIds(quizId, seed)
      : [];
    const loaded = currentNodeId
      ? await loadSanitizedQuestion(
          currentNodeId,
          settings.reviewBeforeSubmit ? ids.indexOf(currentNodeId) + 1 : answered + 1,
          total,
          seed ? `${seed}:${currentNodeId}` : undefined
        )
      : null;
    const question =
      loaded && settings.reviewBeforeSubmit && currentNodeId
        ? { ...loaded, previous: await loadPreviousAnswer(existing.id, currentNodeId) }
        : loaded;
    return NextResponse.json({
      sessionId: existing.id,
      resumed: true,
      reviewMode: settings.reviewBeforeSubmit,
      finished: question === null,
      timeLimitSec: settings.timeLimitSec,
      timeRemainingSec: remainingSeconds(
        existing.startedAt,
        settings.timeLimitSec
      ),
      question,
    });
  }

  // عدد المحاولات المنتهية.
  const finishedCount = await prisma.examSession.count({
    where: {
      studentId,
      quizId,
      status: { in: ["COMPLETED", "TIMED_OUT"] },
    },
  });
  const maxAllowed = settings.maxAttempts + assignment.extraAttempts;
  if (finishedCount >= maxAllowed) {
    // لا محاولات متبقّية: أعِد نتيجة آخر محاولة منتهية بدل خطأ مجرّد، ليتمكّن
    // الطالب من مراجعة اختباره دائماً (تخطّي شاشة السؤال مباشرةً للنتيجة).
    const last = await prisma.examSession.findFirst({
      where: { studentId, quizId, status: { in: ["COMPLETED", "TIMED_OUT"] } },
      orderBy: { completedAt: "desc" },
      select: { id: true },
    });
    if (last) {
      return NextResponse.json({ sessionId: last.id, finished: true });
    }
    return NextResponse.json(
      { error: "استنفدت عدد المحاولات المسموح بها" },
      { status: 403 }
    );
  }

  const attempt = finishedCount + 1;
  const seed = settings.shuffle
    ? attemptSeed(studentId, quizId, attempt)
    : undefined;
  // أيّ استعلام بعميل Prisma العام يجب أن يتمّ **قبل** القفل: داخله تحتجز المعاملة الاتصال (وعلى Vercel
  // connection_limit=1) فاستعلام عامّ داخلها ينتظر اتصالاً لا يتحرّر أبداً (500 بعد المهلة).
  const firstNodeId = await firstQuestionNodeId(quizId, quiz.startNodeId, seed);
  if (!firstNodeId) {
    return NextResponse.json(
      { error: "هذا الاختبار لا يحتوي أسئلة" },
      { status: 422 }
    );
  }

  // التحقّق من الجلسة الجارية وعدد المحاولات ثم الإنشاء تحت قفل (طالب+اختبار) بمعاملته فقط: بدونه يمرّ طلبان متوازيان
  // كلاهما قبل أن يُنشئ أيٌّ منهما جلسته فتُفتح جلستان لمحاولة واحدة (تجاوز حدّ المحاولات واستفادة من كشف الإجابات).
  const outcome = await withAdvisoryLock(`start:${studentId}:${quizId}`, async (tx) => {
    const open = await tx.examSession.findFirst({
      where: { studentId, quizId, status: "IN_PROGRESS" },
      select: { id: true },
    });
    if (open) return { kind: "again" as const };
    const doneNow = await tx.examSession.count({
      where: { studentId, quizId, status: { in: ["COMPLETED", "TIMED_OUT"] } },
    });
    // تغيّر العدد منذ حسابنا (انتهت جلسة) أو استُنفدت المحاولات: أعِد المسار بحسابات جديدة.
    if (doneNow >= maxAllowed || doneNow + 1 !== attempt) return { kind: "again" as const };
    const row = await tx.examSession.create({
      data: {
        studentId,
        quizId,
        status: "IN_PROGRESS",
        currentNodeId: firstNodeId,
        attemptNumber: attempt,
        pathTaken: [],
      },
    });
    return { kind: "created" as const, row };
  });
  if (outcome.kind === "again") {
    // سبقه طلب متوازٍ (أُنشئت الجلسة أو استُنفدت المحاولات): أعِد المسار فيستأنف أو يعيد النتيجة.
    if (depth >= 2) {
      return NextResponse.json({ error: "تعذّر بدء الاختبار الآن — أعد المحاولة." }, { status: 409 });
    }
    return start(_req, props, depth + 1);
  }
  const created = outcome.row;

  const question = await loadSanitizedQuestion(
    firstNodeId,
    1,
    total,
    seed ? `${seed}:${firstNodeId}` : undefined
  );
  return NextResponse.json({
    sessionId: created.id,
    reviewMode: settings.reviewBeforeSubmit,
    finished: false,
    timeLimitSec: settings.timeLimitSec,
    timeRemainingSec: remainingSeconds(created.startedAt, settings.timeLimitSec),
    question,
  });
}
