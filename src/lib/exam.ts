// src/lib/exam.ts
// منطق حلقة الطالب على الخادم: الحراسة، إعدادات الاختبار، اجتياز الشجرة الخطّي،
// تعقيم السؤال (دون كشف الإجابة الصحيحة)، المؤقّت، وإنهاء الجلسة وحساب الدرجة.
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import type { SessionData } from "@/lib/auth";
import { computeScore } from "@/lib/grading";

// ─────────────────────────────────────────────
// الحراسة والإعدادات
// ─────────────────────────────────────────────

/** جلسة طالب صالحة أو null (لغير الطالب أيضاً). */
export async function getStudentSession(): Promise<SessionData | null> {
  const session = await getSession();
  if (!session || session.role !== "STUDENT") return null;
  return session;
}

export interface QuizSettings {
  timeLimitSec: number | null;
  maxAttempts: number;
  revealAnswers: "immediate" | "end";
}

export function parseSettings(raw: unknown): QuizSettings {
  const s = (raw ?? {}) as Record<string, unknown>;
  return {
    timeLimitSec:
      typeof s.timeLimitSec === "number" && s.timeLimitSec > 0
        ? s.timeLimitSec
        : null,
    maxAttempts:
      typeof s.maxAttempts === "number" && s.maxAttempts > 0
        ? s.maxAttempts
        : 1,
    revealAnswers: s.revealAnswers === "end" ? "end" : "immediate",
  };
}

/** هل الاختبار ضمن نافذة الإتاحة الآن؟ */
export function isWithinWindow(
  availableFrom: Date | null,
  availableUntil: Date | null
): boolean {
  const now = Date.now();
  if (availableFrom && now < availableFrom.getTime()) return false;
  if (availableUntil && now > availableUntil.getTime()) return false;
  return true;
}

// ─────────────────────────────────────────────
// المؤقّت (مفروض على الخادم من وقت البدء)
// ─────────────────────────────────────────────

export function remainingSeconds(
  startedAt: Date,
  timeLimitSec: number | null
): number | null {
  if (timeLimitSec == null) return null;
  const elapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000);
  return Math.max(0, timeLimitSec - elapsed);
}

export function isExpired(
  startedAt: Date,
  timeLimitSec: number | null
): boolean {
  return timeLimitSec != null && remainingSeconds(startedAt, timeLimitSec) === 0;
}

// ─────────────────────────────────────────────
// اجتياز الشجرة (خطّي: حافة واحدة ALWAYS لكل عقدة)
// ─────────────────────────────────────────────

async function nextNodeId(
  quizId: string,
  sourceNodeId: string
): Promise<string | null> {
  const edge = await prisma.quizEdge.findFirst({
    where: { quizId, sourceNodeId },
    orderBy: { priority: "asc" },
  });
  return edge?.targetNodeId ?? null;
}

/** أوّل عقدة سؤال انطلاقاً من عقدة البداية. */
export async function firstQuestionNodeId(
  quizId: string,
  startNodeId: string | null
): Promise<string | null> {
  return walkToQuestion(quizId, startNodeId);
}

/** عقدة السؤال التالية بعد عقدة معيّنة (تتخطّى عُقد غير الأسئلة). */
export async function nextQuestionNodeId(
  quizId: string,
  fromNodeId: string
): Promise<string | null> {
  const start = await nextNodeId(quizId, fromNodeId);
  return walkToQuestion(quizId, start);
}

/**
 * عقدة السؤال غير المُجاب التالية بترتيب العرض، مع الالتفاف للبداية:
 * تبحث بعد العقدة الحالية ثم تلتفّ — فالأسئلة المتخطّاة تُؤجَّل لآخر الاختبار.
 * excludeCurrent=true يستبعد العقدة الحالية (للتخطّي قبل تسجيل إجابة).
 * يُعيد null حين لا تبقى أسئلة غير مُجابة.
 */
export async function nextUnansweredNodeId(
  quizId: string,
  sessionId: string,
  fromNodeId: string,
  excludeCurrent = false
): Promise<string | null> {
  const qNodes = await prisma.quizNode.findMany({
    where: { quizId, nodeType: "QUESTION" },
    orderBy: { positionX: "asc" },
    select: { id: true },
  });
  const answeredRows = await prisma.studentAnswer.findMany({
    where: { sessionId },
    select: { nodeId: true },
  });
  const answered = new Set(answeredRows.map((a) => a.nodeId));
  const ids = qNodes.map((n) => n.id);
  const idx = ids.indexOf(fromNodeId);
  const ordered =
    idx >= 0 ? [...ids.slice(idx + 1), ...ids.slice(0, idx + 1)] : ids;
  for (const id of ordered) {
    if (excludeCurrent && id === fromNodeId) continue;
    if (!answered.has(id)) return id;
  }
  return null;
}

/** يتبع الحوافّ حتى يصل لعقدة سؤال، أو null عند النهاية/الانقطاع. */
async function walkToQuestion(
  quizId: string,
  startId: string | null
): Promise<string | null> {
  let current = startId;
  const seen = new Set<string>();
  while (current && !seen.has(current)) {
    seen.add(current);
    const node = await prisma.quizNode.findUnique({ where: { id: current } });
    if (!node) return null;
    if (node.nodeType === "QUESTION") return node.id;
    if (node.nodeType === "END") return null;
    current = await nextNodeId(quizId, current);
  }
  return null;
}

// ─────────────────────────────────────────────
// تعقيم السؤال للعرض أثناء الأداء (لا إجابات صحيحة)
// ─────────────────────────────────────────────

export interface SanitizedOption {
  id: string;
  label: string;
  content: string;
  orderNum: number;
}

export interface SanitizedQuestion {
  nodeId: string;
  questionId: string;
  type: string;
  content: string;
  points: number;
  options: SanitizedOption[]; // فارغة للإجابة القصيرة
  index: number; // ترتيب السؤال (1-أساس)
  total: number; // إجمالي الأسئلة
}

/** يحمّل عقدة سؤال ويعقّمها — يُستبعد isCorrect والإجابات المقبولة والشرح. */
export async function loadSanitizedQuestion(
  nodeId: string,
  index: number,
  total: number
): Promise<SanitizedQuestion | null> {
  const node = await prisma.quizNode.findUnique({
    where: { id: nodeId },
    include: {
      question: { include: { options: { orderBy: { orderNum: "asc" } } } },
    },
  });
  if (!node || !node.question) return null;
  const q = node.question;
  return {
    nodeId: node.id,
    questionId: q.id,
    type: q.type,
    content: q.content,
    points: Number(node.pointsOverride ?? q.points),
    options: q.options.map((o) => ({
      id: o.id,
      label: o.label,
      content: o.content,
      orderNum: o.orderNum,
    })),
    index,
    total,
  };
}

/** عدد عُقد الأسئلة في اختبار. */
export function countQuestionNodes(quizId: string): Promise<number> {
  return prisma.quizNode.count({
    where: { quizId, nodeType: "QUESTION" },
  });
}

// ─────────────────────────────────────────────
// إنهاء الجلسة وحساب الدرجة (نسبة من الأسئلة الصالحة)
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// قائمة اختبارات الطالب (مشتركة بين API وصفحة الخادم)
// ─────────────────────────────────────────────

export type QuizState =
  | "not_started"
  | "in_progress"
  | "completed"
  | "locked";

export interface StudentQuizListItem {
  quizId: string;
  title: string;
  description: string | null;
  questionCount: number;
  timeLimitSec: number | null;
  maxAttempts: number;
  attemptsUsed: number;
  dueDate: Date | null;
  availableFrom: Date | null;
  availableUntil: Date | null;
  state: QuizState;
  canStart: boolean;
  bestPercentage: number | null;
}

export async function listStudentQuizzes(
  studentId: string
): Promise<StudentQuizListItem[]> {
  const assignments = await prisma.quizAssignment.findMany({
    where: { studentId, quiz: { status: "PUBLISHED" } },
    include: {
      quiz: {
        include: {
          nodes: { where: { nodeType: "QUESTION" }, select: { id: true } },
        },
      },
    },
    orderBy: { assignedAt: "desc" },
  });

  const quizIds = assignments.map((a) => a.quizId);
  const sessions = await prisma.examSession.findMany({
    where: { studentId, quizId: { in: quizIds } },
    select: { quizId: true, status: true, percentage: true },
  });

  return assignments.map((a) => {
    const settings = parseSettings(a.quiz.settings);
    const my = sessions.filter((s) => s.quizId === a.quizId);
    const finished = my.filter(
      (s) => s.status === "COMPLETED" || s.status === "TIMED_OUT"
    );
    const inProgress = my.some((s) => s.status === "IN_PROGRESS");
    const open = isWithinWindow(a.quiz.availableFrom, a.quiz.availableUntil);
    const bestPercentage = finished.length
      ? Math.max(...finished.map((s) => Number(s.percentage)))
      : null;

    let state: QuizState;
    if (inProgress) state = "in_progress";
    else if (!open || finished.length >= settings.maxAttempts)
      state = finished.length > 0 ? "completed" : "locked";
    else state = finished.length > 0 ? "completed" : "not_started";

    const canStart =
      open && (inProgress || finished.length < settings.maxAttempts);

    return {
      quizId: a.quizId,
      title: a.quiz.title,
      description: a.quiz.description,
      questionCount: a.quiz.nodes.length,
      timeLimitSec: settings.timeLimitSec,
      maxAttempts: settings.maxAttempts,
      attemptsUsed: finished.length,
      dueDate: a.dueDate,
      availableFrom: a.quiz.availableFrom,
      availableUntil: a.quiz.availableUntil,
      state,
      canStart,
      bestPercentage,
    };
  });
}

export async function finalizeSession(
  sessionId: string,
  status: "COMPLETED" | "TIMED_OUT"
) {
  const session = await prisma.examSession.findUnique({
    where: { id: sessionId },
  });
  if (!session) return null;

  const qNodes = await prisma.quizNode.findMany({
    where: { quizId: session.quizId, nodeType: "QUESTION" },
    include: { question: { select: { points: true } } },
  });
  const answers = await prisma.studentAnswer.findMany({
    where: { sessionId },
    select: { nodeId: true, isCorrect: true },
  });
  const correctByNode = new Map(answers.map((a) => [a.nodeId, a.isCorrect]));

  const score = computeScore(
    qNodes.map((n) => ({
      points: Number(n.pointsOverride ?? n.question?.points ?? 0),
      isCorrect: correctByNode.get(n.id) ?? false,
    }))
  );

  const timeSpent = Math.floor(
    (Date.now() - session.startedAt.getTime()) / 1000
  );

  return prisma.examSession.update({
    where: { id: sessionId },
    data: {
      status,
      completedAt: new Date(),
      totalScore: score.earned,
      maxPossibleScore: score.max,
      percentage: score.percentage,
      timeSpent,
      currentNodeId: null,
    },
  });
}
