// src/components/math/keyboards.ts
// تخطيطات لوحة مفاتيح MathLive حسب المادة، متعدّدة التبويبات (كل تخطيط = تبويب).
// الترتيب: الأكثر استخداماً في منهاج البكالوريا أوّلاً، ثمّ الأقلّ.
// كل مفتاح يُنتج LaTeX يعمل في محرّر MathLive وفي عرض KaTeX/mhchem معاً.
// النوع any تفادياً لتعارض أنواع MathLive المتغيّرة بين الإصدارات.

export type MathLayout = "math" | "physics" | "chemistry";

export const LAYOUT_OPTIONS: { key: MathLayout; label: string }[] = [
  { key: "math", label: "رياضيات" },
  { key: "physics", label: "فيزياء" },
  { key: "chemistry", label: "كيمياء" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Key = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Tab = any;

// ─────────────────────────────────────────────
// الكيمياء — 3 تبويبات: أساسي، عضوية، أيونات وعناصر
// ─────────────────────────────────────────────
const chemBasic: Tab = {
  label: "كيمياء",
  tooltip: "الأساسيات (الأكثر استخداماً)",
  rows: [
    [
      { latex: "#?_{2}", label: "x₂" },
      { latex: "#?_{3}", label: "x₃" },
      { latex: "#?_{#?}", label: "x□" },
      { latex: "#?^{+}", label: "x⁺" },
      { latex: "#?^{-}", label: "x⁻" },
      { latex: "#?^{2+}", label: "x²⁺" },
      { latex: "#?^{2-}", label: "x²⁻" },
      { latex: "\\rightarrow", label: "→" },
      { latex: "\\rightleftharpoons", label: "⇌" },
    ],
    [
      { latex: "+" },
      { latex: "=" },
      { latex: "\\Delta", label: "Δ" },
      { latex: "\\uparrow", label: "↑" },
      { latex: "\\downarrow", label: "↓" },
      { latex: "\\text{(s)}", label: "(s)" },
      { latex: "\\text{(l)}", label: "(l)" },
      { latex: "\\text{(g)}", label: "(g)" },
      { latex: "\\text{(aq)}", label: "(aq)" },
    ],
    [
      { latex: "\\mathrm{H}_{2}\\mathrm{O}", label: "H₂O" },
      { latex: "\\mathrm{CO}_{2}", label: "CO₂" },
      { latex: "\\mathrm{O}_{2}", label: "O₂" },
      { latex: "\\mathrm{H}_{2}", label: "H₂" },
      { latex: "\\mathrm{H}^{+}", label: "H⁺" },
      { latex: "\\mathrm{OH}^{-}", label: "OH⁻" },
      { latex: "\\mathrm{Na}^{+}", label: "Na⁺" },
      { latex: "\\mathrm{Cl}^{-}", label: "Cl⁻" },
    ],
  ],
};

const chemOrganic: Tab = {
  label: "عضوية",
  tooltip: "الكيمياء العضوية",
  rows: [
    [
      { latex: "-\\mathrm{OH}", label: "−OH" },
      { latex: "-\\mathrm{COOH}", label: "−COOH" },
      { latex: "-\\mathrm{CHO}", label: "−CHO" },
      { latex: "-\\mathrm{CO}-", label: "−CO−" },
      { latex: "-\\mathrm{NH}_{2}", label: "−NH₂" },
      { latex: "-\\mathrm{O}-", label: "−O−" },
      { latex: "-\\mathrm{COO}-", label: "−COO−" },
      { latex: "-", label: "−" },
      { latex: "=" },
      { latex: "\\equiv", label: "≡" },
    ],
    [
      { latex: "\\mathrm{CH}_{3}", label: "CH₃" },
      { latex: "\\mathrm{CH}_{2}", label: "CH₂" },
      { latex: "\\mathrm{C}_{2}\\mathrm{H}_{5}", label: "C₂H₅" },
      { latex: "\\mathrm{CH}_{4}", label: "CH₄" },
      { latex: "\\mathrm{C}_{2}\\mathrm{H}_{4}", label: "C₂H₄" },
      { latex: "\\mathrm{C}_{2}\\mathrm{H}_{2}", label: "C₂H₂" },
      { latex: "\\mathrm{C}_{6}\\mathrm{H}_{6}", label: "C₆H₆" },
      { latex: "\\mathrm{R}", label: "R" },
    ],
    [
      { latex: "\\mathrm{C}_{2}\\mathrm{H}_{5}\\mathrm{OH}", label: "C₂H₅OH" },
      { latex: "\\mathrm{CH}_{3}\\mathrm{OH}", label: "CH₃OH" },
      { latex: "\\mathrm{CH}_{3}\\mathrm{COOH}", label: "CH₃COOH" },
      { latex: "\\mathrm{HCOOH}", label: "HCOOH" },
      { latex: "\\mathrm{C}_{n}\\mathrm{H}_{2n+2}", label: "CₙH₂ₙ₊₂" },
      { latex: "\\mathrm{C}_{n}\\mathrm{H}_{2n}", label: "CₙH₂ₙ" },
    ],
  ],
};

const chemIons: Tab = {
  label: "أيونات وعناصر",
  tooltip: "الأيونات المركّبة والعناصر",
  rows: [
    [
      { latex: "\\mathrm{SO}_{4}^{2-}", label: "SO₄²⁻" },
      { latex: "\\mathrm{NO}_{3}^{-}", label: "NO₃⁻" },
      { latex: "\\mathrm{CO}_{3}^{2-}", label: "CO₃²⁻" },
      { latex: "\\mathrm{HCO}_{3}^{-}", label: "HCO₃⁻" },
      { latex: "\\mathrm{PO}_{4}^{3-}", label: "PO₄³⁻" },
      { latex: "\\mathrm{NH}_{4}^{+}", label: "NH₄⁺" },
      { latex: "\\mathrm{MnO}_{4}^{-}", label: "MnO₄⁻" },
      { latex: "#?^{3+}", label: "x³⁺" },
      { latex: "#?^{3-}", label: "x³⁻" },
    ],
    [
      { latex: "\\mathrm{H}", label: "H" },
      { latex: "\\mathrm{C}", label: "C" },
      { latex: "\\mathrm{O}", label: "O" },
      { latex: "\\mathrm{N}", label: "N" },
      { latex: "\\mathrm{S}", label: "S" },
      { latex: "\\mathrm{P}", label: "P" },
      { latex: "\\mathrm{Cl}", label: "Cl" },
      { latex: "\\mathrm{Br}", label: "Br" },
      { latex: "\\mathrm{I}", label: "I" },
      { latex: "\\mathrm{F}", label: "F" },
    ],
    [
      { latex: "\\mathrm{Na}", label: "Na" },
      { latex: "\\mathrm{K}", label: "K" },
      { latex: "\\mathrm{Ca}", label: "Ca" },
      { latex: "\\mathrm{Mg}", label: "Mg" },
      { latex: "\\mathrm{Al}", label: "Al" },
      { latex: "\\mathrm{Fe}", label: "Fe" },
      { latex: "\\mathrm{Cu}", label: "Cu" },
      { latex: "\\mathrm{Zn}", label: "Zn" },
      { latex: "\\mathrm{Ag}", label: "Ag" },
      { latex: "\\mathrm{Mn}", label: "Mn" },
    ],
  ],
};

// ─────────────────────────────────────────────
// الفيزياء — 3 تبويبات: أساسي، يونانية وثوابت، تحليل ووحدات
// ─────────────────────────────────────────────
const physBasic: Tab = {
  label: "فيزياء",
  tooltip: "الأساسيات",
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
      { latex: "=" },
      { latex: "\\approx" },
      { latex: "\\propto" },
      { latex: "<" },
      { latex: ">" },
      { latex: "\\leq", label: "≤" },
      { latex: "\\geq", label: "≥" },
      { latex: "^{\\circ}", label: "°" },
      { latex: "\\rightarrow", label: "→" },
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
    ],
  ],
};

const physSymbols: Tab = {
  label: "رموز",
  tooltip: "الحروف اليونانية والثوابت",
  rows: [
    [
      { latex: "\\theta" },
      { latex: "\\alpha" },
      { latex: "\\beta" },
      { latex: "\\gamma" },
      { latex: "\\lambda" },
      { latex: "\\omega" },
      { latex: "\\mu" },
      { latex: "\\rho" },
      { latex: "\\phi" },
      { latex: "\\pi" },
    ],
    [
      { latex: "\\Omega" },
      { latex: "\\varepsilon", label: "ε" },
      { latex: "\\sigma" },
      { latex: "\\tau" },
      { latex: "\\Phi" },
      { latex: "\\Psi" },
      { latex: "\\nu", label: "ν" },
      { latex: "\\eta", label: "η" },
      { latex: "\\delta" },
      { latex: "\\Sigma" },
    ],
    [
      { latex: "\\hbar" },
      { latex: "\\mathrm{c}", label: "c" },
      { latex: "\\mathrm{g}", label: "g" },
      { latex: "\\mathrm{e}^{-}", label: "e⁻" },
      { latex: "\\infty" },
      { latex: "\\nabla" },
      { latex: "\\partial" },
      { latex: "\\int_{#?}^{#?}", label: "∫" },
      { latex: "\\sum", label: "Σ" },
    ],
  ],
};

const physUnits: Tab = {
  label: "وحدات",
  tooltip: "وحدات إضافية",
  rows: [
    [
      { latex: "\\mathrm{Hz}", label: "Hz" },
      { latex: "\\mathrm{Pa}", label: "Pa" },
      { latex: "\\mathrm{C}", label: "C" },
      { latex: "\\mathrm{T}", label: "T" },
      { latex: "\\mathrm{Wb}", label: "Wb" },
      { latex: "\\mathrm{F}", label: "F" },
      { latex: "\\mathrm{H}", label: "H" },
      { latex: "\\Omega", label: "Ω" },
    ],
    [
      { latex: "\\mathrm{mol}", label: "mol" },
      { latex: "\\mathrm{K}", label: "K" },
      { latex: "\\mathrm{eV}", label: "eV" },
      { latex: "\\mathrm{rad}", label: "rad" },
      { latex: "\\mathrm{rad/s}", label: "rad/s" },
      { latex: "\\mathrm{N\\cdot m}", label: "N·m" },
      { latex: "\\mathrm{kg/m^3}", label: "kg/m³" },
    ],
  ],
};

// ─────────────────────────────────────────────
// الرياضيات — 3 تبويبات: جبر، تحليل، دوال ومثلثات (+ المدمجة)
// ─────────────────────────────────────────────
const mathAlgebra: Tab = {
  label: "جبر",
  tooltip: "الجبر والأعداد",
  rows: [
    [
      { latex: "\\frac{#@}{#?}" },
      { latex: "\\sqrt{#?}" },
      { latex: "\\sqrt[#?]{#?}", label: "ⁿ√" },
      { latex: "#?^{2}", label: "x²" },
      { latex: "#?^{#?}", label: "xⁿ" },
      { latex: "#?_{#?}", label: "x□" },
      { latex: "\\pm" },
      { latex: "\\times" },
      { latex: "\\div" },
    ],
    [
      { latex: "=" },
      { latex: "\\neq", label: "≠" },
      { latex: "<" },
      { latex: ">" },
      { latex: "\\leq", label: "≤" },
      { latex: "\\geq", label: "≥" },
      { latex: "\\left(#?\\right)", label: "( )" },
      { latex: "\\left|#?\\right|", label: "|x|" },
      { latex: "\\%", label: "%" },
    ],
  ],
};

const mathCalculus: Tab = {
  label: "تحليل",
  tooltip: "التفاضل والتكامل والنهايات",
  rows: [
    [
      { latex: "\\int_{#?}^{#?}", label: "∫" },
      { latex: "\\int", label: "∫dx" },
      { latex: "\\frac{d}{dx}", label: "d/dx" },
      { latex: "\\frac{\\partial}{\\partial #?}", label: "∂/∂" },
      { latex: "\\lim_{#?\\to#?}", label: "lim" },
      { latex: "\\sum_{#?}^{#?}", label: "Σ" },
      { latex: "\\prod_{#?}^{#?}", label: "∏" },
    ],
    [
      { latex: "\\infty" },
      { latex: "\\to", label: "→" },
      { latex: "\\mathrm{e}", label: "e" },
      { latex: "\\ln", label: "ln" },
      { latex: "\\log", label: "log" },
      { latex: "\\partial" },
      { latex: "\\nabla" },
      { latex: "\\,dx", label: "dx" },
    ],
  ],
};

const mathFunctions: Tab = {
  label: "دوال",
  tooltip: "الدوال والمثلثات والمتجهات",
  rows: [
    [
      { latex: "\\sin", label: "sin" },
      { latex: "\\cos", label: "cos" },
      { latex: "\\tan", label: "tan" },
      { latex: "\\cot", label: "cot" },
      { latex: "\\pi" },
      { latex: "^{\\circ}", label: "°" },
      { latex: "\\theta" },
      { latex: "\\alpha" },
    ],
    [
      { latex: "\\vec{#?}", label: "→v" },
      { latex: "\\overrightarrow{#?}", label: "→AB" },
      { latex: "\\begin{pmatrix}#?\\\\#?\\end{pmatrix}", label: "(▢▢)" },
      { latex: "\\binom{#?}{#?}", label: "ⁿCᵣ" },
      { latex: "#?!", label: "x!" },
      { latex: "\\in", label: "∈" },
      { latex: "\\mathbb{R}", label: "ℝ" },
    ],
  ],
};

/** تبويبات اللوحة لكل مادة (الأكثر استخداماً أوّلاً)، تنتهي بالمدمجة. */
export function layoutsFor(layout: MathLayout): Tab[] {
  if (layout === "physics")
    return [physBasic, physSymbols, physUnits, "numeric"];
  if (layout === "chemistry")
    return [chemBasic, chemOrganic, chemIons, "numeric"];
  return [mathAlgebra, mathCalculus, mathFunctions, "numeric", "greek"];
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

// نوع المفتاح مُصدَّر للاستعمال المستقبليّ (بنك الرموز/اللوحة المخصّصة).
export type { Key };
