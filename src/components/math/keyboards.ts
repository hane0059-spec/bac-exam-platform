// src/components/math/keyboards.ts
// تخطيطات لوحة مفاتيح MathLive الافتراضية حسب المادة (رياضيات/فيزياء/كيمياء).
// كلّ مفتاح يُنتج LaTeX يعمل في محرّر MathLive وفي عرض KaTeX معاً.
// النوع any تفادياً لتعارض أنواع MathLive المتغيّرة بين الإصدارات.

export type MathLayout = "math" | "physics" | "chemistry";

export const LAYOUT_OPTIONS: { key: MathLayout; label: string }[] = [
  { key: "math", label: "رياضيات" },
  { key: "physics", label: "فيزياء" },
  { key: "chemistry", label: "كيمياء" },
];

// مفاتيح الفيزياء: متجهات، مشتقّات/تكامل، رموز شائعة، ووحدات.
const physicsLayout = {
  label: "فيزياء",
  tooltip: "رموز ووحدات الفيزياء",
  rows: [
    [
      { latex: "\\vec{#?}" },
      { latex: "\\Delta" },
      { latex: "\\frac{#@}{#?}" },
      { latex: "\\sqrt{#?}" },
      { latex: "#?^{2}" },
      { latex: "#?_{#?}" },
      { latex: "\\times" },
      { latex: "\\cdot" },
      { latex: "\\pm" },
    ],
    [
      { latex: "\\theta" },
      { latex: "\\lambda" },
      { latex: "\\omega" },
      { latex: "\\mu" },
      { latex: "\\rho" },
      { latex: "\\Omega" },
      { latex: "\\int_{#?}^{#?}" },
      { latex: "\\partial" },
      { latex: "\\approx" },
    ],
    [
      { latex: "\\times 10^{#?}", label: "×10ⁿ" },
      { latex: "\\mathrm{m/s^2}", label: "m/s²" },
      { latex: "\\mathrm{kg}", label: "kg" },
      { latex: "\\mathrm{N}", label: "N" },
      { latex: "\\mathrm{J}", label: "J" },
      { latex: "\\mathrm{W}", label: "W" },
      { latex: "\\mathrm{V}", label: "V" },
      { latex: "\\mathrm{A}", label: "A" },
    ],
  ],
};

// مفاتيح الكيمياء: لاحقة سفلية/علوية، أسهم التفاعل، شحنات، وصِيَغ شائعة.
const chemistryLayout = {
  label: "كيمياء",
  tooltip: "رموز الكيمياء",
  rows: [
    [
      { latex: "#?_{2}", label: "X₂" },
      { latex: "#?_{3}", label: "X₃" },
      { latex: "#?^{+}", label: "X⁺" },
      { latex: "#?^{-}", label: "X⁻" },
      { latex: "#?^{2+}", label: "X²⁺" },
      { latex: "#?^{2-}", label: "X²⁻" },
      { latex: "\\rightarrow", label: "→" },
      { latex: "\\rightleftharpoons", label: "⇌" },
    ],
    [
      { latex: "H_{2}O", label: "H₂O" },
      { latex: "CO_{2}", label: "CO₂" },
      { latex: "O_{2}", label: "O₂" },
      { latex: "H^{+}", label: "H⁺" },
      { latex: "OH^{-}", label: "OH⁻" },
      { latex: "\\Delta", label: "Δ" },
      { latex: "+", label: "+" },
    ],
  ],
};

/** تخطيطات اللوحة الافتراضية لكلّ مادة (مبدوءةً بالمخصّص ثمّ المدمج). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function layoutsFor(layout: MathLayout): any[] {
  if (layout === "physics") return [physicsLayout, "numeric", "greek"];
  if (layout === "chemistry") return [chemistryLayout, "numeric"];
  return ["numeric", "symbols", "greek"];
}

/**
 * يُعيد تخطيط المادة إن كانت علميّةً (رياضيات/فيزياء/كيمياء)، وإلّا null.
 * تُفعَّل لوحة المعادلات لهذه المواد فقط (لا للعربية/الدينية/الأحياء…).
 */
export function subjectLayout(subjectName?: string): MathLayout | null {
  const n = subjectName ?? "";
  if (/كيمياء|chem/i.test(n)) return "chemistry";
  if (/فيزياء|phys/i.test(n)) return "physics";
  if (/رياضيّ?ات|math/i.test(n)) return "math";
  return null;
}
