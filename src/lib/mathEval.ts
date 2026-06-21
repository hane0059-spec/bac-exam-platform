// src/lib/mathEval.ts
// تقييم المعادلات على الخادم عبر Compute Engine (شقيق MathLive).
// ⚠ خادميّ فقط — لا يُستورَد في مكوّنات العميل (الحزمة ثقيلة).
// يُستعمل لتصحيح إجابات الطالب الرياضية: تقييمٌ عدديّ (للحساب) وتكافؤٌ رمزيّ
// (للإجابة المقالية الرياضية). إجابات الطالب قد تكون مغلّفةً بـ $…$ (للعرض).
import { ComputeEngine } from "@cortex-js/compute-engine";
import { parseNumber } from "@/lib/grading";

let _ce: ComputeEngine | null = null;
function engine(): ComputeEngine {
  return (_ce ??= new ComputeEngine());
}

/** يزيل غلاف $…$ أو $$…$$ ويُقلّم. */
export function stripMathDelimiters(s: string): string {
  let t = s.trim();
  if (t.startsWith("$$") && t.endsWith("$$")) t = t.slice(2, -2);
  else if (t.startsWith("$") && t.endsWith("$")) t = t.slice(1, -1);
  return t.trim();
}

/**
 * يقيّم نصّاً (رقماً عاديّاً أو LaTeX) إلى عددٍ منتهٍ، وإلّا null.
 * يجرّب التطبيع العربي/العشري أوّلاً (أرقام عربية/فاصلة)، ثمّ Compute Engine.
 */
export function evaluateLatexNumber(
  input: string | null | undefined
): number | null {
  if (input == null) return null;
  const s = stripMathDelimiters(String(input));
  if (!s) return null;
  // 1) رقم عاديّ (يدعم الأرقام والفاصلة العربية).
  const plain = parseNumber(s);
  if (plain != null) return plain;
  // 2) تعبير LaTeX عبر Compute Engine.
  try {
    const v = engine().parse(s).N().valueOf();
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * تصحيح سؤال الحساب مع دعم LaTeX: يقيّم إجابة الطالب والقيمة المقبولة عدديّاً
 * ويقارن ضمن هامش الخطأ. `accepted = [القيمة, الهامش؟]`.
 */
export function gradeCalculationLatex(
  accepted: readonly string[],
  studentAnswer: string | null | undefined
): boolean {
  const value = evaluateLatexNumber(accepted[0]);
  const tol = evaluateLatexNumber(accepted[1] ?? "0") ?? 0;
  const ans = evaluateLatexNumber(studentAnswer);
  if (value == null || ans == null) return false;
  return Math.abs(ans - value) <= Math.abs(tol);
}

/**
 * تكافؤ رياضيّ بين تعبيرَي LaTeX (عدديّ أو رمزيّ): مثل $2x$ و$x\cdot2$،
 * أو $\frac12$ و$0.5$. يُستعمل لتصحيح الإجابة المقالية الرياضية.
 */
export function latexEquivalent(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  if (a == null || b == null) return false;
  const sa = stripMathDelimiters(String(a));
  const sb = stripMathDelimiters(String(b));
  if (!sa || !sb) return false;
  try {
    return engine().parse(sa).isEqual(engine().parse(sb)) === true;
  } catch {
    return false;
  }
}
