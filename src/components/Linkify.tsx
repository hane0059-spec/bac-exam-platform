// src/components/Linkify.tsx
// يحوّل روابط http(s) داخل نصّ عادي إلى روابط قابلة للنقر (بلا HTML خام: النصّ
// يبقى مُهرَّباً عبر React، والروابط تقتصر على http/https فقط).
import type { ReactNode } from "react";

const URL_RE = /(https?:\/\/[^\s<>"']+)/g;
const TRAILING = /[.,;:!?)\]}،؛؟]+$/;

export default function Linkify({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  const nodes: ReactNode[] = parts.map((part, i) => {
    if (i % 2 === 0) return part;
    const trail = part.match(TRAILING)?.[0] ?? "";
    const url = trail ? part.slice(0, -trail.length) : part;
    return (
      <span key={i}>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          dir="ltr"
          className="font-bold underline underline-offset-2 hover:opacity-80"
        >
          {url}
        </a>
        {trail}
      </span>
    );
  });
  return <>{nodes}</>;
}
