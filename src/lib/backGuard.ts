// src/lib/backGuard.ts
// حارس زرّ «الرجوع» (زرّ الهاتف/المتصفّح) داخل الصفحة: يمنع خروجاً عَرَضيّاً يُضيّع عملاً غير محفوظ.
// الفكرة: عند التسجيل نُضيف مدخلاً وهمياً في سجلّ المتصفّح (نفس العنوان)، فيستهلك زرّ الرجوع هذا المدخل
// بدل مغادرة الصفحة، ونقرّر نحن: إغلاق لوحة مفتوحة، أو سؤال المستخدم، أو السماح بالمغادرة.
// المدخلات الوهمية المتروكة («ميّتة») تُتخطّى تلقائياً حين يضغط المستخدم الرجوع، فلا تعلق خطوة زائدة.
// ملاحظة: كلّ المنطق في المتصفّح فقط (لا يُستدعى أثناء SSR).
import { useEffect, useRef, useState } from "react";

/** نتيجة معالجة الرجوع: stay = ابقَ مع إبقاء الحارس، done = انتهى الحارس وابقَ، leave = غادر الصفحة فعلاً. */
export type BackResult = "stay" | "done" | "leave";

interface Guard {
  id: number;
  onBack: () => BackResult;
  /** هل يُسحَب مدخله من السجلّ عند إلغاء التسجيل؟ (لوحة مؤقّتة: نعم، حارس نموذج: لا — يخلق سباقاً مع التنقّل بعد الحفظ). */
  pop: boolean;
  /** مدخله ما زال في السجلّ لكنّه لم يعد فعّالاً. */
  dead: boolean;
  /** استُهلك مدخله بزرّ الرجوع. */
  popped: boolean;
}

// تعكس ترتيب المدخلات الوهمية في سجلّ المتصفّح (الأحدث في النهاية).
const stack: Guard[] = [];
let nextId = 1;
let ignore = 0; // popstate ناتج عن history.back() برمجيّاً
let listening = false;

function ensureListener() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("popstate", onPop);
}

function pushEntry(id: number) {
  // لا نمرّر عنواناً: Next.js يحفظ حالته الداخلية ولا يُطلق تنقّلاً.
  window.history.pushState({ __guard: id }, "");
}

/**
 * مغادرة الصفحة فعلاً: كل ما تبقّى من مدخلات وهمية يُلغى دفعةً واحدة (فيكفي تأكيد واحد حتى لو تعدّدت النماذج غير المحفوظة).
 * `sitting` = عدد المدخلات الوهمية التي نقف عليها الآن فوق مدخل الصفحة الحقيقي.
 */
function leaveNow() {
  let sitting = 0;
  while (stack.length > 0) {
    stack.pop();
    sitting++;
  }
  // نقف فوق `sitting` مدخلاً وهمياً، وتحتها مدخل الصفحة ثم الصفحة السابقة.
  window.history.go(-(sitting + 1));
}

function onPop() {
  if (ignore > 0) {
    ignore--;
    return;
  }
  if (stack.length === 0) return;
  const g = stack[stack.length - 1];
  if (g.dead || g.popped) {
    // مدخل ميّت (نموذج انتهى أو تنقّل بعده): المستخدم يريد الرجوع فعلاً ← نتخطّاه مع كل ميّت يليه في خطوة واحدة.
    stack.pop();
    // نقف الآن على المدخل الذي تحت المدخل المستهلَك: إن كان ميّتاً تخطّيناه أيضاً.
    let skips = 0;
    while (stack.length > 0 && stack[stack.length - 1].dead) {
      stack.pop();
      skips++;
    }
    if (stack.length === 0) {
      window.history.go(-(skips + 1)); // خرجنا من كل الحرّاس ← غادر الصفحة
    } else if (skips > 0) {
      ignore++; // سنهبط على مدخل حارس حيّ؛ لا نعالج popstate هذه الهبطة
      window.history.go(-skips);
    }
    return;
  }
  g.popped = true; // استهلك زرّ الرجوع مدخلَه
  const res = g.onBack();
  if (res === "stay") {
    g.popped = false;
    pushEntry(g.id); // أعِد الحماية
    return;
  }
  stack.pop();
  if (res === "leave") leaveNow();
}

function register(onBack: () => BackResult, pop: boolean): Guard {
  ensureListener();
  const g: Guard = { id: nextId++, onBack, pop, dead: false, popped: false };
  stack.push(g);
  pushEntry(g.id);
  return g;
}

function unregister(g: Guard) {
  if (g.popped) {
    const i = stack.indexOf(g);
    if (i >= 0) stack.splice(i, 1);
    return;
  }
  const isTop = stack[stack.length - 1] === g;
  const stateMatches = (window.history.state as { __guard?: number } | null)?.__guard === g.id;
  if (g.pop && isTop && stateMatches) {
    stack.pop();
    ignore++;
    window.history.back();
    return;
  }
  g.dead = true; // المدخل باقٍ في السجلّ؛ يُتخطّى عند الرجوع إليه
}

/**
 * يحمي الصفحة من الرجوع العَرَضيّ ما دام `active`.
 * `onBack` يُستدعى عند ضغط الرجوع ويقرّر النتيجة. `pop`: يسحب المدخل عند الإلغاء (للّوحات المؤقّتة فقط).
 */
export function useBackGuard(active: boolean, onBack: () => BackResult, pop = false) {
  const cb = useRef(onBack);
  cb.current = onBack;
  useEffect(() => {
    if (!active) return;
    const g = register(() => cb.current(), pop);
    return () => unregister(g);
  }, [active, pop]);
}

/**
 * يحمي نموذجاً فيه تغييرات غير محفوظة (`dirty`): تحذير المتصفّح عند الإغلاق/إعادة التحميل،
 * وتأكيد عند زرّ الرجوع (يبقى المستخدم إن رفض).
 */
export function useUnsavedGuard(dirty: boolean, message = "لديك تغييرات غير محفوظة ستضيع إن غادرت الصفحة. هل تريد المغادرة؟") {
  useBackGuard(dirty, () => (window.confirm(message) ? "leave" : "stay"), false);
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);
}

/**
 * غلاف مريح للنماذج: مرّر لقطة نصّية (JSON) لحالة الحقول؛ يُعتبَر النموذج «غير محفوظ» متى اختلفت عن الخطّ الأساس.
 * `markSaved(لقطة?)` بعد نجاح الحفظ (أو قبل مغادرة مؤكَّدة) يجعل الحالة الحالية هي الخطّ الأساس.
 */
export function useUnsavedChanges(snapshot: string) {
  const [baseline, setBaseline] = useState(snapshot);
  const dirty = snapshot !== baseline;
  useUnsavedGuard(dirty);
  return {
    dirty,
    markSaved: (snap?: string) => setBaseline(snap ?? snapshot),
  };
}
