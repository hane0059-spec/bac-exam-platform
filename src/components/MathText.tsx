// src/components/MathText.tsx
// يعرض نصّاً قد يحوي معادلات LaTeX بين $...$ (سطرية) أو $$...$$ (مستقلّة)،
// فيرسمها بـ KaTeX ويُبقي الباقي نصّاً عاديّاً. بلا حالة → يعمل في مكوّنات
// الخادم والعميل معاً. عند فشل صيغة المعادلة يبقى النصّ كما كُتب (لا ينكسر).
import { Fragment, type ReactNode } from "react";
import katex from "katex";

function renderTex(tex: string, displayMode: boolean): string | null {
  try {
    return katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      output: "html",
    });
  } catch {
    return null;
  }
}

// $$...$$ (مستقلّة) أو $...$ (سطرية، بلا سطر جديد بالداخل).
const MATH_RE = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;

export default function MathText({ text }: { text: string | null | undefined }) {
  if (!text) return null;
  if (!text.includes("$")) return <>{text}</>; // مسار سريع: لا معادلات.

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
  return <>{nodes}</>;
}
