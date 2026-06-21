// src/components/math/symbolBank.ts
// بنك الرموز الشامل (حتى مستوى الجامعة) لكل مادة، مصنّفاً بفئات.
// المدرّس يلتقط منه ما يريد إلى «لوحتي» المخصّصة. ملفّ نقيّ (عميل وخادم).
import type { MathLayout } from "./keyboards";

export interface BankSymbol {
  latex: string;
  label: string;
}
export interface BankCategory {
  id: string;
  label: string;
  layout: MathLayout;
  symbols: BankSymbol[];
}

// لوحة المدرّس المخصّصة: رموز مختارة لكل مادة.
export type CustomKeyboard = Record<MathLayout, BankSymbol[]>;

const s = (latex: string, label: string): BankSymbol => ({ latex, label });

export const SYMBOL_BANK: BankCategory[] = [
  // ───────────── كيمياء ─────────────
  {
    id: "chem-basic",
    label: "كيمياء — أساسي",
    layout: "chemistry",
    symbols: [
      s("#?_{2}", "x₂"), s("#?_{3}", "x₃"), s("#?_{4}", "x₄"), s("#?_{#?}", "x□"),
      s("#?^{+}", "x⁺"), s("#?^{-}", "x⁻"), s("#?^{2+}", "x²⁺"), s("#?^{2-}", "x²⁻"),
      s("#?^{3+}", "x³⁺"), s("#?^{3-}", "x³⁻"),
      s("\\rightarrow", "→"), s("\\rightleftharpoons", "⇌"), s("\\longrightarrow", "⟶"),
      s("\\uparrow", "↑"), s("\\downarrow", "↓"), s("+", "+"), s("=", "="), s("\\Delta", "Δ"),
      s("\\text{(s)}", "(s)"), s("\\text{(l)}", "(l)"), s("\\text{(g)}", "(g)"), s("\\text{(aq)}", "(aq)"),
    ],
  },
  {
    id: "chem-molecules",
    label: "كيمياء — جزيئات وأيونات",
    layout: "chemistry",
    symbols: [
      s("\\mathrm{H}_{2}\\mathrm{O}", "H₂O"), s("\\mathrm{CO}_{2}", "CO₂"), s("\\mathrm{O}_{2}", "O₂"),
      s("\\mathrm{H}_{2}", "H₂"), s("\\mathrm{N}_{2}", "N₂"), s("\\mathrm{NH}_{3}", "NH₃"),
      s("\\mathrm{H}^{+}", "H⁺"), s("\\mathrm{OH}^{-}", "OH⁻"), s("\\mathrm{Na}^{+}", "Na⁺"),
      s("\\mathrm{Cl}^{-}", "Cl⁻"), s("\\mathrm{H}_{3}\\mathrm{O}^{+}", "H₃O⁺"),
      s("\\mathrm{SO}_{4}^{2-}", "SO₄²⁻"), s("\\mathrm{NO}_{3}^{-}", "NO₃⁻"), s("\\mathrm{CO}_{3}^{2-}", "CO₃²⁻"),
      s("\\mathrm{HCO}_{3}^{-}", "HCO₃⁻"), s("\\mathrm{PO}_{4}^{3-}", "PO₄³⁻"), s("\\mathrm{NH}_{4}^{+}", "NH₄⁺"),
      s("\\mathrm{MnO}_{4}^{-}", "MnO₄⁻"), s("\\mathrm{Cr}_{2}\\mathrm{O}_{7}^{2-}", "Cr₂O₇²⁻"),
      s("\\mathrm{H}_{2}\\mathrm{SO}_{4}", "H₂SO₄"), s("\\mathrm{HCl}", "HCl"), s("\\mathrm{NaOH}", "NaOH"),
    ],
  },
  {
    id: "chem-organic",
    label: "كيمياء — عضوية",
    layout: "chemistry",
    symbols: [
      s("-\\mathrm{OH}", "−OH"), s("-\\mathrm{COOH}", "−COOH"), s("-\\mathrm{CHO}", "−CHO"),
      s("-\\mathrm{CO}-", "−CO−"), s("-\\mathrm{NH}_{2}", "−NH₂"), s("-\\mathrm{O}-", "−O−"),
      s("-\\mathrm{COO}-", "−COO−"), s("-\\mathrm{NO}_{2}", "−NO₂"), s("-\\mathrm{X}", "−X"),
      s("-", "−"), s("=", "="), s("\\equiv", "≡"),
      s("\\mathrm{CH}_{3}", "CH₃"), s("\\mathrm{CH}_{2}", "CH₂"), s("\\mathrm{C}_{2}\\mathrm{H}_{5}", "C₂H₅"),
      s("\\mathrm{CH}_{4}", "CH₄"), s("\\mathrm{C}_{2}\\mathrm{H}_{4}", "C₂H₄"), s("\\mathrm{C}_{2}\\mathrm{H}_{2}", "C₂H₂"),
      s("\\mathrm{C}_{6}\\mathrm{H}_{6}", "C₆H₆"), s("\\mathrm{R}", "R"), s("\\mathrm{R}'", "R′"),
      s("\\mathrm{C}_{2}\\mathrm{H}_{5}\\mathrm{OH}", "C₂H₅OH"), s("\\mathrm{CH}_{3}\\mathrm{OH}", "CH₃OH"),
      s("\\mathrm{CH}_{3}\\mathrm{COOH}", "CH₃COOH"), s("\\mathrm{HCOOH}", "HCOOH"),
      s("\\mathrm{C}_{n}\\mathrm{H}_{2n+2}", "CₙH₂ₙ₊₂"), s("\\mathrm{C}_{n}\\mathrm{H}_{2n}", "CₙH₂ₙ"),
    ],
  },
  {
    id: "chem-elements",
    label: "كيمياء — عناصر",
    layout: "chemistry",
    symbols: [
      s("\\mathrm{H}", "H"), s("\\mathrm{He}", "He"), s("\\mathrm{Li}", "Li"), s("\\mathrm{C}", "C"),
      s("\\mathrm{N}", "N"), s("\\mathrm{O}", "O"), s("\\mathrm{F}", "F"), s("\\mathrm{Na}", "Na"),
      s("\\mathrm{Mg}", "Mg"), s("\\mathrm{Al}", "Al"), s("\\mathrm{Si}", "Si"), s("\\mathrm{P}", "P"),
      s("\\mathrm{S}", "S"), s("\\mathrm{Cl}", "Cl"), s("\\mathrm{K}", "K"), s("\\mathrm{Ca}", "Ca"),
      s("\\mathrm{Fe}", "Fe"), s("\\mathrm{Cu}", "Cu"), s("\\mathrm{Zn}", "Zn"), s("\\mathrm{Ag}", "Ag"),
      s("\\mathrm{Br}", "Br"), s("\\mathrm{I}", "I"), s("\\mathrm{Mn}", "Mn"), s("\\mathrm{Pb}", "Pb"),
    ],
  },
  {
    id: "chem-nuclear",
    label: "كيمياء — نووية ومتقدّم",
    layout: "chemistry",
    symbols: [
      s("{}^{#?}_{#?}\\mathrm{X}", "ᴬ_Z X"), s("{}^{4}_{2}\\mathrm{He}", "⁴₂He"),
      s("{}^{1}_{0}\\mathrm{n}", "¹₀n"), s("{}^{0}_{-1}\\mathrm{e}", "⁰₋₁e"),
      s("\\alpha", "α"), s("\\beta", "β"), s("\\gamma", "γ"),
      s("K_{a}", "Kₐ"), s("K_{b}", "K_b"), s("K_{e}", "Kₑ"), s("\\mathrm{pH}", "pH"),
      s("\\overset{\\Delta}{\\rightarrow}", "→ᐞ"), s("\\xrightarrow{#?}", "→[ ]"),
    ],
  },

  // ───────────── فيزياء ─────────────
  {
    id: "phys-ops",
    label: "فيزياء — عمليات",
    layout: "physics",
    symbols: [
      s("\\vec{#?}", "→a"), s("\\frac{#@}{#?}", "▢/▢"), s("\\sqrt{#?}", "√"),
      s("#?^{2}", "x²"), s("#?^{#?}", "xⁿ"), s("#?_{#?}", "x□"),
      s("\\times", "×"), s("\\cdot", "·"), s("\\pm", "±"), s("\\times 10^{#?}", "×10ⁿ"),
      s("\\Delta", "Δ"), s("=", "="), s("\\approx", "≈"), s("\\propto", "∝"),
      s("^{\\circ}", "°"), s("\\rightarrow", "→"), s("\\leq", "≤"), s("\\geq", "≥"),
    ],
  },
  {
    id: "phys-greek",
    label: "فيزياء — يونانية",
    layout: "physics",
    symbols: [
      s("\\alpha", "α"), s("\\beta", "β"), s("\\gamma", "γ"), s("\\delta", "δ"), s("\\Delta", "Δ"),
      s("\\theta", "θ"), s("\\lambda", "λ"), s("\\mu", "μ"), s("\\nu", "ν"), s("\\pi", "π"),
      s("\\rho", "ρ"), s("\\sigma", "σ"), s("\\tau", "τ"), s("\\phi", "φ"), s("\\Phi", "Φ"),
      s("\\omega", "ω"), s("\\Omega", "Ω"), s("\\varepsilon", "ε"), s("\\eta", "η"), s("\\Psi", "Ψ"),
    ],
  },
  {
    id: "phys-calc",
    label: "فيزياء — تحليل وثوابت",
    layout: "physics",
    symbols: [
      s("\\int_{#?}^{#?}", "∫"), s("\\oint", "∮"), s("\\partial", "∂"), s("\\nabla", "∇"),
      s("\\sum", "Σ"), s("\\infty", "∞"), s("\\hbar", "ℏ"), s("\\mathrm{c}", "c"),
      s("\\mathrm{g}", "g"), s("\\mathrm{e}^{-}", "e⁻"), s("\\langle #? \\rangle", "⟨ ⟩"),
      s("\\vec{E}", "E⃗"), s("\\vec{B}", "B⃗"), s("\\vec{F}", "F⃗"), s("\\vec{v}", "v⃗"),
    ],
  },
  {
    id: "phys-units",
    label: "فيزياء — وحدات",
    layout: "physics",
    symbols: [
      s("\\mathrm{m}", "m"), s("\\mathrm{s}", "s"), s("\\mathrm{kg}", "kg"), s("\\mathrm{m/s}", "m/s"),
      s("\\mathrm{m/s^2}", "m/s²"), s("\\mathrm{N}", "N"), s("\\mathrm{J}", "J"), s("\\mathrm{W}", "W"),
      s("\\mathrm{V}", "V"), s("\\mathrm{A}", "A"), s("\\mathrm{Hz}", "Hz"), s("\\mathrm{Pa}", "Pa"),
      s("\\mathrm{C}", "C"), s("\\mathrm{T}", "T"), s("\\mathrm{Wb}", "Wb"), s("\\mathrm{F}", "F"),
      s("\\mathrm{H}", "H"), s("\\Omega", "Ω"), s("\\mathrm{mol}", "mol"), s("\\mathrm{K}", "K"),
      s("\\mathrm{eV}", "eV"), s("\\mathrm{rad}", "rad"), s("\\mathrm{N\\cdot m}", "N·m"),
    ],
  },

  // ───────────── رياضيات ─────────────
  {
    id: "math-algebra",
    label: "رياضيات — جبر",
    layout: "math",
    symbols: [
      s("\\frac{#@}{#?}", "▢/▢"), s("\\sqrt{#?}", "√"), s("\\sqrt[#?]{#?}", "ⁿ√"),
      s("#?^{2}", "x²"), s("#?^{#?}", "xⁿ"), s("#?_{#?}", "x□"), s("\\pm", "±"),
      s("\\times", "×"), s("\\div", "÷"), s("=", "="), s("\\neq", "≠"),
      s("<", "<"), s(">", ">"), s("\\leq", "≤"), s("\\geq", "≥"),
      s("\\left|#?\\right|", "|x|"), s("\\%", "%"),
    ],
  },
  {
    id: "math-calculus",
    label: "رياضيات — تحليل",
    layout: "math",
    symbols: [
      s("\\int_{#?}^{#?}", "∫"), s("\\int", "∫dx"), s("\\frac{d}{dx}", "d/dx"),
      s("\\frac{\\partial}{\\partial #?}", "∂/∂"), s("\\lim_{#?\\to#?}", "lim"),
      s("\\sum_{#?}^{#?}", "Σ"), s("\\prod_{#?}^{#?}", "∏"), s("\\infty", "∞"),
      s("\\to", "→"), s("\\mathrm{e}", "e"), s("\\ln", "ln"), s("\\log", "log"),
      s("\\partial", "∂"), s("\\nabla", "∇"),
    ],
  },
  {
    id: "math-trig",
    label: "رياضيات — دوال ومثلثات",
    layout: "math",
    symbols: [
      s("\\sin", "sin"), s("\\cos", "cos"), s("\\tan", "tan"), s("\\cot", "cot"),
      s("\\sin^{-1}", "sin⁻¹"), s("\\pi", "π"), s("^{\\circ}", "°"), s("\\theta", "θ"),
      s("\\vec{#?}", "→v"), s("\\overrightarrow{#?}", "→AB"),
      s("\\begin{pmatrix}#?\\\\#?\\end{pmatrix}", "(▢▢)"), s("\\binom{#?}{#?}", "ⁿCᵣ"), s("#?!", "x!"),
    ],
  },
  {
    id: "math-sets",
    label: "رياضيات — مجموعات ومنطق",
    layout: "math",
    symbols: [
      s("\\in", "∈"), s("\\notin", "∉"), s("\\subset", "⊂"), s("\\cup", "∪"), s("\\cap", "∩"),
      s("\\emptyset", "∅"), s("\\forall", "∀"), s("\\exists", "∃"), s("\\Rightarrow", "⇒"),
      s("\\Leftrightarrow", "⇔"), s("\\mathbb{R}", "ℝ"), s("\\mathbb{N}", "ℕ"), s("\\mathbb{Z}", "ℤ"),
      s("\\mathbb{Q}", "ℚ"), s("\\mathbb{C}", "ℂ"),
    ],
  },
  {
    id: "math-complex",
    label: "رياضيات — أعداد مركّبة",
    layout: "math",
    symbols: [
      s("i", "i"), s("\\left|z\\right|", "|z|"), s("\\bar{z}", "z̄"), s("\\arg(z)", "arg z"),
      s("\\mathrm{Re}(z)", "Re"), s("\\mathrm{Im}(z)", "Im"), s("e^{i\\theta}", "e^{iθ}"),
      s("\\cos\\theta + i\\sin\\theta", "cosθ+isinθ"),
    ],
  },
];

/** فئات البنك لمادة معيّنة. */
export function bankCategoriesFor(layout: MathLayout): BankCategory[] {
  return SYMBOL_BANK.filter((c) => c.layout === layout);
}
