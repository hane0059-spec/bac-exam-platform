// src/lib/exam.ts
// منطق حلقة الطالب على الخادم: الحراسة، إعدادات الاختبار، اجتياز الشجرة الخطّي،
// تعقيم السؤال (دون كشف الإجابة الصحيحة)، المؤقّت، وإنهاء الجلسة وحساب الدرجة.
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import type { SessionData } from "@/lib/auth";
import {
  computeScore,
  parseBlankAnswers,
  fillTemplateForDisplay,
} from "@/lib/grading";
import { parseFileExamSettings } from "@/lib/fileExam";
import { createNotification } from "@/lib/notifications";

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
  shuffle: boolean; // خلط ترتيب الأسئلة والخيارات لكل محاولة (نزاهة)
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
    shuffle: s.shuffle === true,
  };
}

// ─────────────────────────────────────────────
// خلط مبذور ثابت (نفس البذرة = نفس الترتيب) — للنزاهة دون كسر الاستئناف.
// الخلط عرضيّ فقط؛ التصحيح بمعرّفات الخيارات لا بترتيبها.
// ─────────────────────────────────────────────

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: readonly T[], seed: string): T[] {
  const rnd = mulberry32(hashStr(seed));
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** بذرة ثابتة لمحاولة (طالب+اختبار+رقم المحاولة) — تستقرّ عبر الاستئناف. */
export function attemptSeed(
  studentId: string,
  quizId: string,
  attempt: number
): string {
  return `${studentId}:${quizId}:${attempt}`;
}

/** معرّفات عُقد الأسئلة بترتيب العرض، أو مخلوطةً ببذرة. */
async function orderedQuestionNodeIds(
  quizId: string,
  seed?: string
): Promise<string[]> {
  const qNodes = await prisma.quizNode.findMany({
    where: { quizId, nodeType: "QUESTION" },
    orderBy: { positionX: "asc" },
    select: { id: true },
  });
  const ids = qNodes.map((n) => n.id);
  return seed ? seededShuffle(ids, seed) : ids;
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

/** أوّل عقدة سؤال انطلاقاً من عقدة البداية (أو أوّل المخلوط عند الخلط). */
export async function firstQuestionNodeId(
  quizId: string,
  startNodeId: string | null,
  seed?: string
): Promise<string | null> {
  if (seed) {
    const ids = await orderedQuestionNodeIds(quizId, seed);
    return ids[0] ?? null;
  }
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
  excludeCurrent = false,
  seed?: string
): Promise<string | null> {
  const ids = await orderedQuestionNodeIds(quizId, seed);
  const answeredRows = await prisma.studentAnswer.findMany({
    where: { sessionId },
    select: { nodeId: true },
  });
  const answered = new Set(answeredRows.map((a) => a.nodeId));
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
  total: number,
  optionSeed?: string
): Promise<SanitizedQuestion | null> {
  const node = await prisma.quizNode.findUnique({
    where: { id: nodeId },
    include: {
      question: { include: { options: { orderBy: { orderNum: "asc" } } } },
    },
  });
  if (!node || !node.question) return null;
  const q = node.question;
  // ملء الفراغات: الخيارات تحمل الإجابات المقبولة — لا تُرسَل للمتصفّح إطلاقاً.
  // يبني الطالبُ الفراغاتِ من نصّ القالب (countBlanks) لا من الخيارات.
  let options =
    q.type === "FILL_BLANK"
      ? []
      : q.options.map((o) => ({
          id: o.id,
          label: o.label,
          content: o.content,
          orderNum: o.orderNum,
        }));
  // الترتيب يُخلَط دائماً (وإلا ظهرت العناصر بترتيبها الصحيح)؛ غيره يُخلَط بالإعداد.
  const shuffle = q.type === "ORDER" || optionSeed != null;
  if (shuffle) options = seededShuffle(options, optionSeed ?? `order:${nodeId}`);
  // لا تكشف موضع الترتيب الصحيح: orderNum يصير مجرّد ترتيب عرض.
  options = options.map((o, i) => ({ ...o, orderNum: i }));
  return {
    nodeId: node.id,
    questionId: q.id,
    type: q.type,
    content: q.content,
    points: Number(node.pointsOverride ?? q.points),
    options,
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
  isFileBased: boolean;
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

    const effectiveMax = settings.maxAttempts + a.extraAttempts;

    let state: QuizState;
    if (inProgress) state = "in_progress";
    else if (!open || finished.length >= effectiveMax)
      state = finished.length > 0 ? "completed" : "locked";
    else state = finished.length > 0 ? "completed" : "not_started";

    const canStart =
      open && (inProgress || finished.length < effectiveMax);

    return {
      quizId: a.quizId,
      title: a.quiz.title,
      description: a.quiz.description,
      isFileBased: a.quiz.isFileBased,
      questionCount: a.quiz.nodes.length,
      timeLimitSec: settings.timeLimitSec,
      maxAttempts: effectiveMax,
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

// ─────────────────────────────────────────────
// مراجعة الجلسة (مشتركة بين نتيجة الطالب ومتابعة المدرّس)
// ─────────────────────────────────────────────

export interface SessionReviewItem {
  index: number;
  nodeId: string;
  type: string;
  content: string;
  points: number;
  scoreEarned: number;
  isCorrect: boolean;
  answered: boolean;
  needsReview: boolean;
  isCancelled: boolean;
  explanation: string | null;
  textAnswer: string | null;
  acceptedAnswers: string[];
  options: {
    id: string;
    label: string;
    content: string;
    isCorrect: boolean;
    selected: boolean;
  }[];
}

export interface SessionReview {
  quizTitle: string;
  studentName: string;
  status: string;
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  items: SessionReviewItem[];
}

/** يبني مراجعة جلسة كاملةً (دون فحص ملكية — يتولّاه المنادي). */
export async function getSessionReview(
  sessionId: string
): Promise<SessionReview | null> {
  const exam = await prisma.examSession.findUnique({
    where: { id: sessionId },
    include: {
      quiz: { select: { title: true } },
      student: { select: { firstName: true, lastName: true } },
    },
  });
  if (!exam) return null;

  const qNodes = await prisma.quizNode.findMany({
    where: { quizId: exam.quizId, nodeType: "QUESTION" },
    orderBy: { positionX: "asc" },
    include: {
      question: { include: { options: { orderBy: { orderNum: "asc" } } } },
    },
  });
  const answers = await prisma.studentAnswer.findMany({
    where: { sessionId: exam.id },
    include: { selectedOptions: { select: { id: true } } },
  });
  const answerByNode = new Map(answers.map((a) => [a.nodeId, a]));

  const items: SessionReviewItem[] = qNodes.map((n, i) => {
    const q = n.question!;
    const ans = answerByNode.get(n.id);
    const selectedIds = new Set(ans?.selectedOptions.map((o) => o.id) ?? []);

    // الترتيب: يُعرَض كنصّ مرقّم (تسلسل الطالب مقابل التسلسل الصحيح).
    if (q.type === "ORDER") {
      const byId = new Map(q.options.map((o) => [o.id, o.content]));
      const correctOrdered = [...q.options]
        .sort((a, b) => a.orderNum - b.orderNum)
        .map((o, k) => `${k + 1}. ${o.content}`)
        .join("   ");
      const studentIds = (ans?.textAnswer ?? "").split(",").filter(Boolean);
      const studentOrdered = studentIds
        .map((id, k) => `${k + 1}. ${byId.get(id) ?? "؟"}`)
        .join("   ");
      return {
        index: i + 1,
        nodeId: n.id,
        type: q.type,
        content: q.content,
        points: Number(n.pointsOverride ?? q.points),
        scoreEarned: ans ? Number(ans.scoreEarned) : 0,
        isCorrect: ans?.isCorrect ?? false,
        answered: Boolean(ans),
        needsReview: false,
        isCancelled: q.isCancelled,
        explanation: q.explanation ?? null,
        textAnswer: ans ? studentOrdered : null,
        acceptedAnswers: [correctOrdered],
        options: [],
      };
    }

    // ملء الفراغات: يُعرَض النصّ بالخطوط، وإجابات الطالب/النموذجية مرقّمةً.
    if (q.type === "FILL_BLANK") {
      const blanks = [...q.options].sort((a, b) => a.orderNum - b.orderNum);
      let studentArr: string[] = [];
      try {
        const parsed = JSON.parse(ans?.textAnswer ?? "[]");
        if (Array.isArray(parsed)) studentArr = parsed;
      } catch {
        studentArr = [];
      }
      const studentText = blanks
        .map((_, k) => `${k + 1}. ${(studentArr[k] ?? "").trim() || "—"}`)
        .join("   ");
      const modelText = blanks
        .map((o, k) => `${k + 1}. ${parseBlankAnswers(o.content).join(" / ")}`)
        .join("   ");
      return {
        index: i + 1,
        nodeId: n.id,
        type: q.type,
        content: fillTemplateForDisplay(q.content),
        points: Number(n.pointsOverride ?? q.points),
        scoreEarned: ans ? Number(ans.scoreEarned) : 0,
        isCorrect: ans?.isCorrect ?? false,
        answered: Boolean(ans),
        needsReview: ans?.needsReview ?? false,
        isCancelled: q.isCancelled,
        explanation: q.explanation ?? null,
        textAnswer: ans ? studentText : null,
        acceptedAnswers: [modelText],
        options: [],
      };
    }

    return {
      index: i + 1,
      nodeId: n.id,
      type: q.type,
      content: q.content,
      points: Number(n.pointsOverride ?? q.points),
      scoreEarned: ans ? Number(ans.scoreEarned) : 0,
      isCorrect: ans?.isCorrect ?? false,
      answered: Boolean(ans),
      needsReview: ans?.needsReview ?? false,
      isCancelled: q.isCancelled,
      explanation: q.explanation ?? null,
      textAnswer: ans?.textAnswer ?? null,
      acceptedAnswers: q.type === "SHORT_ANSWER" ? q.acceptedAnswers : [],
      options: q.options.map((o) => ({
        id: o.id,
        label: o.label,
        content: o.content,
        isCorrect: o.isCorrect,
        selected: selectedIds.has(o.id),
      })),
    };
  });

  return {
    quizTitle: exam.quiz.title,
    studentName: exam.student
      ? `${exam.student.firstName} ${exam.student.lastName}`
      : "",
    status: exam.status,
    totalScore: Number(exam.totalScore),
    maxPossibleScore: Number(exam.maxPossibleScore),
    percentage: Number(exam.percentage),
    items,
  };
}

/**
 * يُشعر مدرّس الاختبار الورقي بأنّ الطالب سلّم ورقته (بانتظار تصحيحه).
 * فشل الإشعار لا يكسر التسليم. يُربَط بصفحة إجابات الاختبار الورقي.
 */
export async function notifyFileExamSubmitted(sessionId: string): Promise<void> {
  try {
    const s = await prisma.examSession.findUnique({
      where: { id: sessionId },
      select: {
        quizId: true,
        quiz: { select: { creatorId: true, title: true } },
        student: { select: { firstName: true, lastName: true } },
      },
    });
    if (!s) return;
    await createNotification({
      userId: s.quiz.creatorId,
      type: "exam_needs_grading",
      message: `سلّم «${s.student.firstName} ${s.student.lastName}» ورقة اختبار «${s.quiz.title}» — بانتظار تصحيحك.`,
      linkUrl: `/teacher/file-exams/${s.quizId}/submissions`,
    });
  } catch {
    // تجاهل أخطاء الإشعار.
  }
}

/**
 * يفرض مهلة الاختبار الورقي على الخادم: إن انتهى الوقت لجلسة جارية،
 * تُرسَل للتصحيح إن وُجدت صور (COMPLETED + needsGrading)، وإلا TIMED_OUT.
 * يُعيد true إن أنهى الجلسة بسبب انتهاء الوقت.
 */
export async function finalizeFileSessionIfExpired(
  sessionId: string
): Promise<boolean> {
  const s = await prisma.examSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      status: true,
      startedAt: true,
      quiz: { select: { isFileBased: true, settings: true } },
    },
  });
  if (!s || !s.quiz.isFileBased || s.status !== "IN_PROGRESS") return false;
  const settings = parseFileExamSettings(s.quiz.settings);
  if (!settings.timeLimitSec || !isExpired(s.startedAt, settings.timeLimitSec))
    return false;

  const pages = await prisma.attachment.count({
    where: { sessionId: s.id, kind: "ANSWER_UPLOAD" },
  });
  await prisma.examSession.update({
    where: { id: s.id },
    data: pages > 0
      ? {
          status: "COMPLETED",
          needsGrading: true,
          completedAt: new Date(),
          timeSpent: settings.timeLimitSec,
          maxPossibleScore: settings.maxScore,
          totalScore: 0,
          percentage: 0,
        }
      : {
          status: "TIMED_OUT",
          completedAt: new Date(),
          timeSpent: settings.timeLimitSec,
          maxPossibleScore: settings.maxScore,
        },
  });
  // إن سُلّمت ورقةٌ (صور موجودة) عند انتهاء الوقت، أشعِر المدرّس بالتصحيح.
  if (pages > 0) await notifyFileExamSubmitted(s.id);
  return true;
}

export async function finalizeSession(
  sessionId: string,
  status: "COMPLETED" | "TIMED_OUT"
) {
  const session = await prisma.examSession.findUnique({
    where: { id: sessionId },
    include: {
      quiz: { select: { creatorId: true, title: true } },
      student: { select: { firstName: true, lastName: true } },
    },
  });
  if (!session) return null;

  const qNodes = await prisma.quizNode.findMany({
    where: { quizId: session.quizId, nodeType: "QUESTION" },
    include: { question: { select: { points: true, isCancelled: true } } },
  });
  const answers = await prisma.studentAnswer.findMany({
    where: { sessionId },
    select: { nodeId: true, isCorrect: true, scoreEarned: true, needsReview: true },
  });
  const ansByNode = new Map(answers.map((a) => [a.nodeId, a]));

  const score = computeScore(
    qNodes.map((n) => {
      const a = ansByNode.get(n.id);
      return {
        points: Number(n.pointsOverride ?? n.question?.points ?? 0),
        isCorrect: a?.isCorrect ?? false,
        earned: a ? Number(a.scoreEarned) : 0,
        isCancelled: n.question?.isCancelled ?? false,
      };
    })
  );

  const timeSpent = Math.floor(
    (Date.now() - session.startedAt.getTime()) / 1000
  );

  const updated = await prisma.examSession.update({
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

  // إشعار المدرّس مالك الاختبار بأنّ الطالب سلّم — مرّةً واحدة عند الانتقال من
  // «قيد الأداء». تُبرَز حاجة التصحيح إن وُجدت إجابة بانتظار المراجعة.
  // فشل الإشعار لا يكسر تسليم الطالب (الجلسة حُدّثت أصلاً).
  if (session.status === "IN_PROGRESS") {
    try {
      const anyReview = answers.some((a) => a.needsReview);
      const studentName = `${session.student.firstName} ${session.student.lastName}`;
      await createNotification({
        userId: session.quiz.creatorId,
        type: anyReview ? "exam_needs_grading" : "exam_submitted",
        message: anyReview
          ? `سلّم «${studentName}» اختبار «${session.quiz.title}» — بانتظار تصحيحك.`
          : `أنهى «${studentName}» اختبار «${session.quiz.title}» (${score.percentage}%).`,
        linkUrl: `/teacher/sessions/${sessionId}`,
      });
    } catch {
      // تجاهل أخطاء الإشعار.
    }
  }

  return updated;
}

/**
 * يعيد حساب درجة جلسة موجودة من إجاباتها الحالية (يحترم الأسئلة المُلغاة
 * والدرجات الجزئية) — دون تغيير حالتها. يُستخدم عند إلغاء سؤال.
 */
export async function recomputeSessionScore(sessionId: string): Promise<void> {
  const session = await prisma.examSession.findUnique({
    where: { id: sessionId },
    select: { quizId: true },
  });
  if (!session) return;

  const qNodes = await prisma.quizNode.findMany({
    where: { quizId: session.quizId, nodeType: "QUESTION" },
    select: {
      id: true,
      pointsOverride: true,
      question: { select: { points: true, isCancelled: true } },
    },
  });
  const answers = await prisma.studentAnswer.findMany({
    where: { sessionId },
    select: { nodeId: true, isCorrect: true, scoreEarned: true },
  });
  const ansByNode = new Map(answers.map((a) => [a.nodeId, a]));

  const score = computeScore(
    qNodes.map((n) => {
      const a = ansByNode.get(n.id);
      return {
        points: Number(n.pointsOverride ?? n.question?.points ?? 0),
        isCorrect: a?.isCorrect ?? false,
        earned: a ? Number(a.scoreEarned) : 0,
        isCancelled: n.question?.isCancelled ?? false,
      };
    })
  );
  await prisma.examSession.update({
    where: { id: sessionId },
    data: {
      totalScore: score.earned,
      maxPossibleScore: score.max,
      percentage: score.percentage,
    },
  });
}
