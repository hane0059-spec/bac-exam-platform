// src/components/MathText.tsx
// يعرض نصّاً قد يحوي معادلات LaTeX بين $...$ (سطرية) أو $$...$$ (مستقلّة)،
// فيرسمها بـ KaTeX ويُبقي الباقي نصّاً عاديّاً. بلا حالة → يعمل في مكوّنات
// الخادم والعميل معاً. عند فشل صيغة المعادلة يبقى النصّ كما كُتب (لا ينكسر).
import { Fragment, type CSSProperties, type ReactNode } from "react";
import katex from "katex";
// دعم \ce{...} للكيمياء (mhchem). **يجب** الاستيراد عبر مسار الحزمة (`katex/contrib/mhchem` ← النسخة .mjs)
// لا عبر `katex/dist/contrib/mhchem.js` (UMD يستورد `katex` الـCJS): كان ذلك يسجّل الإضافة على نسخة KaTeX
// مختلفة عن التي نرسم بها فيظهر `\ce{H2O}` نصّاً أحمر في المتصفّح.
import "katex/contrib/mhchem";
import { mathliveMacros, normalizeMathliveTex } from "@/lib/mathliveTex";

function renderTex(tex: string, displayMode: boolean): string | null {
  try {
    // أوامر MathLive الخاصّة (\placeholder، \imaginaryI، \exponentialE…) لا يعرفها KaTeX فكانت تظهر نصّاً أحمر.
    return katex.renderToString(normalizeMathliveTex(tex), {
      displayMode,
      throwOnError: false,
      output: "html",
      macros: mathliveMacros(),
    });
  } catch {
    return null;
  }
}

// $$...$$ (مستقلّة) أو $...$ (سطرية، بلا سطر جديد بالداخل).
const MATH_RE = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;

// عزل الاتجاه: `unicode-bidi: plaintext` يُحَلّ اتجاهه من أوّل حرف قويّ مثل `dir="auto"` لكنّه ليس سمةً
// ولا `<bdi>` — فلا تتجاهله فقرةٌ أبوها `dir="auto"` (كان `<bdi dir="auto">` يُخفي النصّ عن كشف الأب
// فتُحَلّ الفقرة LTR وينحاز السؤال العربي لليسار).
const BIDI: CSSProperties = { unicodeBidi: "plaintext" };

export default function MathText({ text }: { text: string | null | undefined }) {
  if (!text) return null;
  if (!text.includes("$")) return <span style={BIDI}>{text}</span>; // مسار سريع: لا معادلات.

  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  MATH_RE.lastIndex = 0;
  while ((m = MATH_RE.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const isBlock = m[1] != null;
    const tex = (isBlock ? m[1] : m[2]) ?? "";
    const html = renderTex(tex, isBlock);
    nodes.push(
      html ? (
        <span key={key++} dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <Fragment key={key++}>{m[0]}</Fragment>
      )
    );
    last = MATH_RE.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <span style={BIDI}>{nodes}</span>;
}
