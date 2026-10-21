// src/lib/printHtml.ts
// يطبع مستند HTML كاملاً عبر iframe مخفيّ (بلا نافذة منبثقة تحجبها المتصفّحات). للعميل فقط.
export function printHtmlInHiddenFrame(html: string): void {
  const frame = document.createElement("iframe");
  frame.style.cssText =
    "position:fixed;width:0;height:0;border:0;right:0;bottom:0;visibility:hidden";
  frame.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 60000);
  };
  frame.srcdoc = html;
  document.body.appendChild(frame);
}
