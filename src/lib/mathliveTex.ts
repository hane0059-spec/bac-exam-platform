// src/lib/mathliveTex.ts
// محرّر المعادلات MathLive يُنتج أوامر LaTeX خاصّة به لا يعرفها KaTeX (مُعرِّض العرض عند الطالب والوليّ والمعاينة):
//   \placeholder[id]{نصّ}  ← خانة فارغة/مظلَّلة
//   \imaginaryI \imaginaryJ \exponentialE \differentialD \capitalDifferentialD ← ثوابت قائمة
// فكان KaTeX يعرض الصيغة كلّها نصّاً أحمر (مثل «\placeholder» و«\exponentialE25»). نُحوِّلها هنا إلى ما يفهمه KaTeX.
// دوال نقيّة بلا اعتماد على المتصفّح (تُختبَر في vitest).

/** وحدات KaTeX الكبيرة (macros) للثوابت؛ تُمرَّر نسخة جديدة لكل استدعاء لأنّ KaTeX قد يعدّلها (\gdef). */
export function mathliveMacros(): Record<string, string> {
  return {
    "\\imaginaryI": "\\mathrm{i}",
    "\\imaginaryJ": "\\mathrm{j}",
    "\\exponentialE": "\\mathrm{e}",
    "\\differentialD": "\\mathrm{d}",
    "\\capitalDifferentialD": "\\mathrm{D}",
  };
}

// \placeholder  أو  \placeholder[المعرّف]  أو  \placeholder[المعرّف]{المحتوى}  (المحتوى بلا أقواس متداخلة).
const PLACEHOLDER_RE = /\\placeholder(?:\[[^\]]*\])?(?:\{([^{}]*)\})?/g;

/**
 * يستبدل `\placeholder` بصندوق: فارغاً ← □، وبمحتوى ← \boxed{المحتوى}.
 * ما سوى ذلك يُترك كما هو (KaTeX يتولّى الباقي، والثوابت عبر `mathliveMacros`).
 */
export function normalizeMathliveTex(tex: string): string {
  if (!tex.includes("\\placeholder")) return tex;
  return tex.replace(PLACEHOLDER_RE, (_m, content: string | undefined) =>
    content && content.trim() ? `\\boxed{${content}}` : "\\square",
  );
}
