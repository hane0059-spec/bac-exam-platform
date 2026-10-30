// src/lib/a11yLabels.ts
// ربط تلقائي للحقول بلا اسم برمجي بأقرب «label» ظاهر سابق لها (إتاحة الوصول لقارئات الشاشة).
// المشكلة (قيست 2026-10-30): نماذج كثيرة فيها <label> ظاهر بجانب الحقل بلا for/id، فيُنطَق الحقل بلا اسم.
// الحلّ مركزيّ بدل تعديل مئات المواضع: لكل حقل بلا اسم نبحث صعوداً (حتى 4 مستويات) عن أقرب label سابق
// له داخل الحاوية نفسها ولم يُربَط بحقل آخر، فنربطهما (id/htmlFor). وإن لم يوجد label نستعمل placeholder/title.
// لا نغيّر أي حقل له اسم أصلاً، ولا نمسّ القيم أو الأحداث.

const CONTROL = "input, select, textarea";
const SKIP_TYPES = new Set(["hidden", "submit", "button", "image", "reset"]);
let seq = 0;

function hasName(el: HTMLElement): boolean {
  if (el.getAttribute("aria-label")?.trim() || el.getAttribute("aria-labelledby") || el.getAttribute("title")?.trim()) {
    return true;
  }
  if (el.id && el.ownerDocument.querySelector(`label[for="${CSS.escape(el.id)}"]`)) return true;
  if (el.closest("label")) return true;
  return false;
}

function isUsableLabel(l: HTMLLabelElement): boolean {
  if (l.htmlFor) return false; // مرتبط بحقل بالفعل
  if (l.querySelector(CONTROL)) return false; // يلفّ حقلاً (مرتبط ضمنياً)
  return (l.textContent ?? "").trim().length > 0;
}

/** أقرب label صالح يسبق الحقل داخل أحد أسلافه القريبين (آخر label سابق بين أبناء السلف المباشرين). */
function nearestPrecedingLabel(control: HTMLElement): HTMLLabelElement | null {
  let node: HTMLElement | null = control;
  for (let depth = 0; depth < 4 && node && node.parentElement; depth++) {
    const parent: HTMLElement = node.parentElement;
    let found: HTMLLabelElement | null = null;
    for (const child of Array.from(parent.children)) {
      if (child === node) break;
      if (child instanceof HTMLLabelElement && isUsableLabel(child)) found = child;
      else if (child.matches?.(CONTROL)) found = null; // حقل آخر بين الـlabel وهذا الحقل: الـlabel له لا لنا
    }
    if (found) return found;
    node = parent;
  }
  return null;
}

/** يربط حقول بلا اسم داخل `root`. آمن لإعادة الاستدعاء (idempotent). يُعيد عدد ما عُدِّل. */
export function associateLabels(root: ParentNode = document): number {
  let changed = 0;
  const controls = Array.from(root.querySelectorAll<HTMLElement>(CONTROL));
  for (const el of controls) {
    if (el instanceof HTMLInputElement && SKIP_TYPES.has(el.type)) continue;
    if (hasName(el)) continue;
    const label = nearestPrecedingLabel(el);
    if (label) {
      if (!el.id) el.id = `a11y-${++seq}`;
      label.htmlFor = el.id;
      changed++;
      continue;
    }
    const hint = (el as HTMLInputElement).placeholder?.trim();
    if (hint) {
      el.setAttribute("aria-label", hint);
      changed++;
      continue;
    }
    // قائمة منسدلة بلا تسمية ظاهرة (مرشّحات): اسمها من خيارها الافتراضي الفارغ («كل المواد» ونحوه).
    if (el instanceof HTMLSelectElement) {
      const empty = Array.from(el.options).find((o) => o.value === "");
      const text = (empty?.text ?? "").replace(/^[\s—–-]+|[\s—–-]+$/g, "");
      if (text) {
        el.setAttribute("aria-label", text);
        changed++;
      }
    }
  }
  return changed;
}
