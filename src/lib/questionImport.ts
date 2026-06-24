// src/lib/questionImport.ts
// تطبيع ملفّات بنك الأسئلة (JSON) إلى مُدخلات أسئلة المنصّة — دالّة نقيّة قابلة للاختبار.
// تدعم صيغتين: الأنواع صغيرة الأحرف (multiple_choice/true_false/analysis/image_interpretation)
// وأنماط البكالوريا كبيرة الأحرف (MCQ_*/TF/ORDER/MATCH/LABEL/…). لا تغيير مخطط.

export type QType =
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "ESSAY"
  | "ORDER"
  | "FILL_BLANK"
  | "MATCHING"
  | "DIAGRAM_LABEL";

export type Difficulty = "EASY" | "MEDIUM" | "HARD" | "EXPERT";

export interface NormalizedOption {
  content: string;
  isCorrect: boolean;
}
export interface NormalizedPair {
  left: string;
  right: string;
}
export interface NormalizedQuestion {
  sourceId: string;
  sourceType: string;
  type: QType;
  content: string;
  difficulty: Difficulty;
  /** علامة السؤال — مُشتقّة من علامات الملفّ إن وُجدت، وإلّا 1. */
  points: number;
  explanation: string;
  tags: string[];
  options: NormalizedOption[];
  acceptedAnswers: string[];
  matchingPairs: NormalizedPair[];
  warnings: string[];
}
export interface NormalizeError {
  sourceId: string;
  sourceType: string;
  reason: string;
}
export interface NormalizeResult {
  subjectName: string | null;
  total: number;
  items: NormalizedQuestion[];
  errors: NormalizeError[];
  byType: Record<QType, number>;
}

// ─────────── أدوات قراءة آمنة لقيم JSON غير الموثوقة ───────────
type Raw = Record<string, unknown>;
const isObj = (v: unknown): v is Raw =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const asStr = (v: unknown): string | undefined =>
  typeof v === "string" ? v : undefined;
const asArr = (v: unknown): unknown[] | undefined =>
  Array.isArray(v) ? v : undefined;
const asNum = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;

/** علامة السؤال من الملفّ: total_marks ثمّ marks ثمّ مجموع سلّم التصحيح، وإلّا 1. */
function pointsOf(q: Raw): number {
  const clamp = (n: number) => Math.min(Math.max(n, 1), 999.99);
  const direct = asNum(q.total_marks) ?? asNum(q.marks);
  if (direct && direct > 0) return clamp(direct);
  const rubric = asArr(q.scoring_rubric);
  if (rubric?.length) {
    const sum = rubric.reduce<number>(
      (s, r) => s + (isObj(r) ? asNum(r.marks) ?? 0 : 0),
      0
    );
    if (sum > 0) return clamp(sum);
  }
  return 1;
}

const MCQ_TYPES = new Set([
  "multiple_choice",
  "MCQ_TEXT",
  "analysis",
  "image_interpretation",
  "MCQ_GRAPH",
  "MCQ_IMAGE",
  "MCQ_DIAGRAM",
  "MCQ_PEDIGREE",
]);
const TF_TYPES = new Set(["true_false", "TF"]);

function difficultyOf(level: unknown): Difficulty {
  switch (asStr(level)?.toLowerCase()) {
    case "easy":
      return "EASY";
    case "hard":
      return "HARD";
    case "expert":
      return "EXPERT";
    default:
      return "MEDIUM";
  }
}

/** أوّل وصف شكل/رسم متوفّر (هذه الملفّات تحمل وصفاً نصّياً لا صورة). */
function figureDesc(q: Raw): string | undefined {
  return (
    asStr(q.graph_description) ??
    asStr(q.image_description) ??
    asStr(q.diagram_description) ??
    asStr(q.pedigree_description)
  );
}

/** يزيل بادئة الترقيم «1- » أو «أ- » من عناصر أعمدة المطابقة. */
function stripListPrefix(s: string): string {
  return s.replace(/^\s*[^\s-]+\s*[-–]\s*/, "").trim();
}

// ─────────── بناة الأنواع ───────────

function buildMcq(q: Raw, base: BaseFields): NormalizedQuestion {
  const stem = asStr(q.stem) ?? asStr(q.text) ?? "";
  const opts = asArr(q.options);
  const answer = asStr(q.answer);
  if (!stem) throw new Error("نصّ السؤال مفقود");
  if (!opts || opts.length < 2) throw new Error("خيارات الاختيار ناقصة");
  if (!answer) throw new Error("الإجابة الصحيحة مفقودة");

  const options: NormalizedOption[] = [];
  let matched = false;
  for (const o of opts) {
    if (!isObj(o)) continue;
    const text = asStr(o.text) ?? asStr(o.content);
    const key = asStr(o.key);
    if (!text) continue;
    const isCorrect = key === answer;
    if (isCorrect) matched = true;
    options.push({ content: text, isCorrect });
  }
  if (options.length < 2) throw new Error("خيارات الاختيار ناقصة");
  if (!matched) throw new Error("الإجابة الصحيحة لا تطابق أيّ خيار");
  if (options.length > 6) throw new Error("عدد الخيارات يتجاوز 6");

  const warnings = [...base.warnings];
  const fig = figureDesc(q);
  const content = fig
    ? `${stem}\n\n(وصف الشكل: ${fig})`
    : stem;
  if (fig) warnings.push("أُدرج وصف الشكل نصّاً (لا صورة في الملفّ)");

  return {
    ...base,
    type: "MULTIPLE_CHOICE",
    content,
    explanation: asStr(q.explanation) ?? "",
    options,
    warnings,
  };
}

function buildTf(q: Raw, base: BaseFields): NormalizedQuestion {
  const stem = asStr(q.stem) ?? asStr(q.text) ?? "";
  if (!stem) throw new Error("نصّ السؤال مفقود");

  let isTrue: boolean;
  const opts = asArr(q.options);
  const answer = asStr(q.answer)?.trim();
  if (opts && answer) {
    // صيغة multiple_choice-style: options[{key,text:صحيح/خطأ}] + answer=key
    const sel = opts.find((o) => isObj(o) && asStr(o.key) === answer);
    const selText = isObj(sel) ? asStr(sel.text) ?? "" : "";
    isTrue = /صح/.test(selText);
  } else if (answer) {
    isTrue = answer.startsWith("صح");
  } else {
    throw new Error("الإجابة الصحيحة مفقودة");
  }

  return {
    ...base,
    type: "TRUE_FALSE",
    content: stem,
    explanation: asStr(q.explanation) ?? asStr(q.correction) ?? "",
    options: [
      { content: "صح", isCorrect: isTrue },
      { content: "خطأ", isCorrect: !isTrue },
    ],
  };
}

function buildOrder(q: Raw, base: BaseFields): NormalizedQuestion {
  const stem = asStr(q.stem) ?? "";
  const steps = asArr(q.shuffled_steps);
  const order = asArr(q.correct_order);
  if (!stem) throw new Error("نصّ السؤال مفقود");
  if (!steps || !order || order.length !== steps.length)
    throw new Error("بيانات الترتيب ناقصة أو غير متطابقة");

  const seq: NormalizedOption[] = [];
  for (const idx of order) {
    const i = typeof idx === "number" ? idx : Number(idx);
    const step = asStr(steps[i - 1]);
    if (!step) throw new Error("مؤشّر ترتيب غير صالح");
    seq.push({ content: step, isCorrect: false });
  }
  if (seq.length < 2 || seq.length > 8)
    throw new Error("سؤال الترتيب يتطلّب من 2 إلى 8 عناصر");

  return { ...base, type: "ORDER", content: stem, explanation: "", options: seq };
}

function buildMatch(q: Raw, base: BaseFields): NormalizedQuestion {
  const stem = asStr(q.stem) ?? "";
  const colA = asArr(q.column_A);
  const colB = asArr(q.column_B);
  const key = q.answer_key;
  if (!stem) throw new Error("نصّ السؤال مفقود");
  if (!colA || !colB || !isObj(key))
    throw new Error("بيانات المطابقة ناقصة");

  // حرف العمود B → نصّه (بعد إزالة البادئة).
  const rightByLetter = new Map<string, string>();
  for (const b of colB) {
    const s = asStr(b);
    if (!s) continue;
    const letter = s.trim()[0];
    if (letter) rightByLetter.set(letter, stripListPrefix(s));
  }

  const pairs: NormalizedPair[] = [];
  colA.forEach((a, i) => {
    const left = asStr(a);
    if (!left) return;
    const letter = asStr(key[String(i + 1)]);
    const right = letter ? rightByLetter.get(letter) : undefined;
    if (!right) throw new Error("مفتاح المطابقة لا يحلّ كل الأزواج");
    pairs.push({ left: stripListPrefix(left), right });
  });
  if (pairs.length < 2 || pairs.length > 8)
    throw new Error("سؤال المطابقة يتطلّب من 2 إلى 8 أزواج");

  return {
    ...base,
    type: "MATCHING",
    content: stem,
    explanation: "",
    matchingPairs: pairs,
  };
}

// CONCEPT_MAP → ملء فراغات: استبدال [n: …] بـ [[ ]] وجمع الإجابات بترتيب الظهور.
function buildConceptMap(q: Raw, base: BaseFields): NormalizedQuestion {
  const stem = asStr(q.stem) ?? "";
  const structure = asStr(q.structure);
  const nodes = q.empty_nodes;
  if (!structure || !isObj(nodes)) throw new Error("بيانات خارطة المفاهيم ناقصة");

  const answers: string[] = [];
  const filled = structure.replace(/\[(\d+)\s*:[^\]]*\]/g, (_m, n: string) => {
    const ans = asStr(nodes[n]);
    answers.push(ans ?? "");
    return "[[ ]]";
  });
  if (answers.length < 1) throw new Error("لا فراغات في خارطة المفاهيم");
  if (answers.length > 8)
    throw new Error("خارطة المفاهيم تتجاوز 8 فراغات (تُستورَد كمقالي)");
  if (answers.some((a) => !a)) throw new Error("بعض عُقد الخارطة بلا إجابة");

  return {
    ...base,
    type: "FILL_BLANK",
    content: `${stem}\n\n${filled}`,
    explanation: "",
    options: answers.map((a) => ({ content: a, isCorrect: true })),
  };
}

// LABEL / DIAGRAM_LABEL → توسيم رسم: فراغات مرقّمة وإجاباتها من correct_labels،
// والصورة المرقّمة يرفعها المدرّس لاحقاً (هي وحدها الخطوة اليدوية).
function buildDiagramLabel(q: Raw, base: BaseFields): NormalizedQuestion {
  const stem =
    asStr(q.stem) ??
    asStr(q.text) ??
    "لاحظ الشكل المرقّم واكتب المسمّى المناسب لكلّ رقم.";
  const labels = q.correct_labels;
  if (!isObj(labels)) throw new Error("سؤال التوسيم يحتاج correct_labels");

  const entries = Object.entries(labels)
    .map(([k, v]) => ({ n: Number(k), v: asStr(v) }))
    .filter((e) => Number.isFinite(e.n) && e.v)
    .sort((a, b) => a.n - b.n);
  if (entries.length < 1 || entries.length > 12)
    throw new Error("توسيم الرسم يتطلّب من 1 إلى 12 تسمية مرقّمة");

  const fig = figureDesc(q);
  const content = fig ? `${stem}\n\n(وصف الشكل المؤقّت: ${fig})` : stem;

  return {
    ...base,
    type: "DIAGRAM_LABEL",
    content,
    explanation: asStr(q.explanation) ?? "",
    options: entries.map((e) => ({ content: e.v as string, isCorrect: true })),
    warnings: [
      ...base.warnings,
      "توسيم رسم — يرفع المدرّس الصورة المرقّمة لاحقاً من صفحة تعديل السؤال",
    ],
  };
}

// كل ما تبقّى (مقالي/شرح/تعليل/مقارنة/مسائل/شجرة نسب/…) → مقالي يدويّ
// مع نموذج الإجابة في الشرح، فلا يضيع أيّ سؤال.
function buildEssay(q: Raw, base: BaseFields): NormalizedQuestion {
  const content = essayContent(q);
  if (!content) throw new Error("لا نصّ قابلاً للاستيراد");
  return {
    ...base,
    type: "ESSAY",
    content,
    explanation: essayModelAnswer(q),
    warnings: [...base.warnings, "حُوّل إلى سؤال مقاليّ يُصحَّح يدوياً"],
  };
}

function essayContent(q: Raw): string {
  let base =
    asStr(q.stem) ??
    asStr(q.case) ??
    (asStr(q.phenomenon)
      ? `علّل الظاهرة الآتية: ${asStr(q.phenomenon)}`
      : undefined) ??
    asStr(q.text) ??
    "";
  const topicA = asStr(q.topic_A);
  const topicB = asStr(q.topic_B);
  const aspects = asArr(q.comparison_aspects)
    ?.map((a) => asStr(a))
    .filter(Boolean) as string[] | undefined;
  if (!base && topicA && topicB) {
    base = `قارن بين «${topicA}» و«${topicB}»${
      aspects?.length ? ` من حيث: ${aspects.join("، ")}` : ""
    }.`;
  }

  const extra: string[] = [];
  const fig = figureDesc(q);
  if (fig) extra.push(`(وصف الشكل: ${fig})`);

  const numbered = asArr(q.numbered_parts)
    ?.map((x) => asStr(x))
    .filter(Boolean);
  if (numbered?.length)
    extra.push(`العناصر المرقّمة: ${numbered.join("، ")}`);

  const items = asArr(q.items);
  if (items?.length) {
    const lines = items
      .map((it) => (isObj(it) ? asStr(it.term) : undefined))
      .filter(Boolean)
      .map((t) => `- ${t}`);
    if (lines.length) extra.push(lines.join("\n"));
  }

  const questions = asArr(q.questions);
  if (questions?.length) {
    const lines = questions
      .map((x, i) => (asStr(x) ? `${i + 1}. ${asStr(x)}` : null))
      .filter(Boolean);
    if (lines.length) extra.push(lines.join("\n"));
  }

  return [base, ...extra].filter(Boolean).join("\n\n").trim();
}

function essayModelAnswer(q: Raw): string {
  const parts: string[] = [];
  const push = (s?: string) => {
    if (s) parts.push(s);
  };

  push(asStr(q.explanation));
  if (asStr(q.correction)) push(`التصحيح: ${asStr(q.correction)}`);

  const kp = asArr(q.key_points);
  if (kp?.length)
    push(
      kp
        .map((p, i) => (asStr(p) ? `${i + 1}. ${asStr(p)}` : null))
        .filter(Boolean)
        .join("\n")
    );

  const rubric = asArr(q.scoring_rubric);
  if (rubric?.length)
    push(
      rubric
        .map((r) =>
          isObj(r)
            ? `• ${asStr(r.point) ?? ""}${
                r.marks != null ? ` (${r.marks} علامة)` : ""
              }`
            : null
        )
        .filter(Boolean)
        .join("\n")
    );

  const items = asArr(q.items);
  if (items?.length)
    push(
      items
        .map((it) =>
          isObj(it)
            ? `- ${asStr(it.term) ?? ""}: ${
                asStr(it.correct_location) ?? asStr(it.one_function) ?? ""
              }`
            : null
        )
        .filter(Boolean)
        .join("\n")
    );

  if (isObj(q.correct_labels))
    push(
      Object.entries(q.correct_labels)
        .map(([k, v]) => `${k}: ${asStr(v) ?? ""}`)
        .join("\n")
    );

  if (isObj(q.answer_table)) {
    const topicA = asStr(q.topic_A) ?? "أ";
    const topicB = asStr(q.topic_B) ?? "ب";
    push(
      Object.entries(q.answer_table)
        .map(([aspect, vals]) => {
          const arr = asArr(vals);
          const a = arr ? asStr(arr[0]) ?? "" : "";
          const b = arr ? asStr(arr[1]) ?? "" : "";
          return `${aspect} — ${topicA}: ${a} | ${topicB}: ${b}`;
        })
        .join("\n")
    );
  }

  if (isObj(q.full_solution))
    push(
      Object.entries(q.full_solution)
        .map(([k, v]) => {
          if (isObj(v))
            return `${k}: ${Object.entries(v)
              .map(([k2, v2]) => `${k2}=${asStr(v2) ?? ""}`)
              .join("؛ ")}`;
          return `${k}: ${asStr(v) ?? ""}`;
        })
        .join("\n")
    );

  if (asStr(q.answer_key)) push(asStr(q.answer_key));
  else if (isObj(q.answer_key))
    push(
      Object.entries(q.answer_key)
        .map(([k, v]) => `${k}: ${asStr(v) ?? ""}`)
        .join("\n")
    );

  return parts.join("\n\n").trim();
}

interface BaseFields {
  sourceId: string;
  sourceType: string;
  difficulty: Difficulty;
  points: number;
  tags: string[];
  warnings: string[];
  explanation: string;
  content: string;
  options: NormalizedOption[];
  acceptedAnswers: string[];
  matchingPairs: NormalizedPair[];
}

function normalizeOne(q: Raw): NormalizedQuestion {
  const sourceType = asStr(q.type) ?? "?";
  const conceptId = asStr(q.concept_id);
  const base: BaseFields = {
    sourceId: asStr(q.id) ?? "—",
    sourceType,
    difficulty: difficultyOf(q.level),
    points: pointsOf(q),
    tags: ["مُستورَد", ...(conceptId ? [`مرجع:${conceptId}`] : [])],
    warnings: [],
    explanation: "",
    content: "",
    options: [],
    acceptedAnswers: [],
    matchingPairs: [],
  };

  if (MCQ_TYPES.has(sourceType)) return buildMcq(q, base);
  if (TF_TYPES.has(sourceType)) return buildTf(q, base);
  if (sourceType === "ORDER") return buildOrder(q, base);
  if (sourceType === "MATCH") return buildMatch(q, base);
  if (sourceType === "LABEL" || sourceType === "DIAGRAM_LABEL") {
    try {
      return buildDiagramLabel(q, base);
    } catch {
      // بلا correct_labels صالحة → مقالي بلا فقدان.
      return buildEssay(q, base);
    }
  }
  if (sourceType === "CONCEPT_MAP") {
    try {
      return buildConceptMap(q, base);
    } catch {
      // فراغات أكثر من 8 أو عُقد ناقصة → احتياطياً كمقالي بلا فقدان.
      return buildEssay(q, base);
    }
  }
  return buildEssay(q, base);
}

const EMPTY_BY_TYPE: Record<QType, number> = {
  MULTIPLE_CHOICE: 0,
  TRUE_FALSE: 0,
  ESSAY: 0,
  ORDER: 0,
  FILL_BLANK: 0,
  MATCHING: 0,
  DIAGRAM_LABEL: 0,
};

/** يطبّع ملفّ بنك أسئلة كاملاً. لا يرمي؛ يجمع الأخطاء لكل سؤال على حدة. */
export function normalizeBankJson(raw: unknown): NormalizeResult {
  if (!isObj(raw)) throw new Error("الملفّ ليس كائن JSON صالحاً");
  const questions = asArr(raw.questions);
  if (!questions) throw new Error("الملفّ لا يحوي مصفوفة «questions»");

  const meta = isObj(raw.metadata) ? raw.metadata : {};
  const subjectName = asStr(meta.subject) ?? null;

  const items: NormalizedQuestion[] = [];
  const errors: NormalizeError[] = [];
  const byType: Record<QType, number> = { ...EMPTY_BY_TYPE };

  for (const q of questions) {
    if (!isObj(q)) {
      errors.push({ sourceId: "—", sourceType: "?", reason: "عنصر غير صالح" });
      continue;
    }
    try {
      const n = normalizeOne(q);
      items.push(n);
      byType[n.type] += 1;
    } catch (e) {
      errors.push({
        sourceId: asStr(q.id) ?? "—",
        sourceType: asStr(q.type) ?? "?",
        reason: e instanceof Error ? e.message : "خطأ غير معروف",
      });
    }
  }

  return { subjectName, total: questions.length, items, errors, byType };
}

/** تسمية عربية لنوع المنصّة (للعرض في المعاينة). */
export const Q_TYPE_LABEL: Record<QType, string> = {
  MULTIPLE_CHOICE: "اختيار من متعدّد",
  TRUE_FALSE: "صح/خطأ",
  ESSAY: "مقاليّ (يدويّ)",
  ORDER: "ترتيب",
  FILL_BLANK: "ملء فراغات",
  MATCHING: "مطابقة",
  DIAGRAM_LABEL: "توسيم رسم (الصورة لاحقاً)",
};
