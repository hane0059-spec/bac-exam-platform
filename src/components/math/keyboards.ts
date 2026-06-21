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

// مفاتيح الفيزياء: عمليات وأشكال، حروف يونانية، تحليل، ووحدات النظام الدولي.
const physicsLayout = {
  label: "فيزياء",
  tooltip: "رموز ووحدات الفيزياء",
  rows: [
    [
      { latex: "\\vec{#?}", label: "→a" },
      { latex: "\\frac{#@}{#?}" },
      { latex: "\\sqrt{#?}" },
      { latex: "#?^{2}", label: "x²" },
      { latex: "#?^{#?}", label: "xⁿ" },
      { latex: "#?_{#?}", label: "x□" },
      { latex: "\\times" },
      { latex: "\\cdot" },
      { latex: "\\pm" },
      { latex: "\\times 10^{#?}", label: "×10ⁿ" },
    ],
    [
      { latex: "\\Delta" },
      { latex: "\\theta" },
      { latex: "\\alpha" },
      { latex: "\\beta" },
      { latex: "\\lambda" },
      { latex: "\\omega" },
      { latex: "\\mu" },
      { latex: "\\rho" },
      { latex: "\\phi" },
      { latex: "\\pi" },
      { latex: "\\Omega" },
    ],
    [
      { latex: "\\int_{#?}^{#?}", label: "∫" },
      { latex: "\\partial" },
      { latex: "\\nabla" },
      { latex: "\\approx" },
      { latex: "\\propto" },
      { latex: "\\infty" },
      { latex: "^{\\circ}", label: "°" },
      { latex: "\\hbar" },
      { latex: "\\rightarrow", label: "→" },
      { latex: "=" },
    ],
    [
      { latex: "\\mathrm{m}", label: "m" },
      { latex: "\\mathrm{s}", label: "s" },
      { latex: "\\mathrm{kg}", label: "kg" },
      { latex: "\\mathrm{m/s}", label: "m/s" },
      { latex: "\\mathrm{m/s^2}", label: "m/s²" },
      { latex: "\\mathrm{N}", label: "N" },
      { latex: "\\mathrm{J}", label: "J" },
      { latex: "\\mathrm{W}", label: "W" },
      { latex: "\\mathrm{V}", label: "V" },
      { latex: "\\mathrm{A}", label: "A" },
      { latex: "\\mathrm{Hz}", label: "Hz" },
      { latex: "\\mathrm{Pa}", label: "Pa" },
    ],
  ],
};

// مفاتيح الكيمياء: لواحق/شحنات، أسهم/حالات/شروط، عناصر شائعة، وأيونات وجزيئات.
const chemistryLayout = {
  label: "كيمياء",
  tooltip: "رموز الكيمياء",
  rows: [
    [
      { latex: "#?_{2}", label: "x₂" },
      { latex: "#?_{3}", label: "x₃" },
      { latex: "#?_{4}", label: "x₄" },
      { latex: "#?_{#?}", label: "x□" },
      { latex: "#?^{+}", label: "x⁺" },
      { latex: "#?^{-}", label: "x⁻" },
      { latex: "#?^{2+}", label: "x²⁺" },
      { latex: "#?^{2-}", label: "x²⁻" },
      { latex: "#?^{3+}", label: "x³⁺" },
      { latex: "#?^{3-}", label: "x³⁻" },
    ],
    [
      { latex: "\\rightarrow", label: "→" },
      { latex: "\\rightleftharpoons", label: "⇌" },
      { latex: "\\longrightarrow", label: "⟶" },
      { latex: "\\uparrow", label: "↑" },
      { latex: "\\downarrow", label: "↓" },
      { latex: "+" },
      { latex: "=" },
      { latex: "\\Delta", label: "Δ" },
      { latex: "\\text{(s)}", label: "(s)" },
      { latex: "\\text{(l)}", label: "(l)" },
      { latex: "\\text{(g)}", label: "(g)" },
      { latex: "\\text{(aq)}", label: "(aq)" },
    ],
    [
      { latex: "\\mathrm{H}", label: "H" },
      { latex: "\\mathrm{C}", label: "C" },
      { latex: "\\mathrm{O}", label: "O" },
      { latex: "\\mathrm{N}", label: "N" },
      { latex: "\\mathrm{Na}", label: "Na" },
      { latex: "\\mathrm{K}", label: "K" },
      { latex: "\\mathrm{Ca}", label: "Ca" },
      { latex: "\\mathrm{Mg}", label: "Mg" },
      { latex: "\\mathrm{Cl}", label: "Cl" },
      { latex: "\\mathrm{S}", label: "S" },
      { latex: "\\mathrm{Fe}", label: "Fe" },
      { latex: "\\mathrm{Cu}", label: "Cu" },
    ],
    [
      { latex: "\\mathrm{H}_{2}\\mathrm{O}", label: "H₂O" },
      { latex: "\\mathrm{CO}_{2}", label: "CO₂" },
      { latex: "\\mathrm{O}_{2}", label: "O₂" },
      { latex: "\\mathrm{H}_{2}", label: "H₂" },
      { latex: "\\mathrm{N}_{2}", label: "N₂" },
      { latex: "\\mathrm{NH}_{3}", label: "NH₃" },
      { latex: "\\mathrm{H}^{+}", label: "H⁺" },
      { latex: "\\mathrm{OH}^{-}", label: "OH⁻" },
      { latex: "\\mathrm{Cl}^{-}", label: "Cl⁻" },
      { latex: "\\mathrm{Na}^{+}", label: "Na⁺" },
      { latex: "\\mathrm{SO}_{4}^{2-}", label: "SO₄²⁻" },
      { latex: "\\mathrm{NO}_{3}^{-}", label: "NO₃⁻" },
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
