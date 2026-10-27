// src/lib/matchingUi.ts
// منطق واجهة المطابقة للطالب (نقيّ): الإجابة مصفوفة نصوص — value[i] = نصّ العنصر الأيمن المختار للعنصر الأيسر i ("" = لا اختيار).
// الربط واحد-لواحد: اختيار أيمنَ مستعمَل لعنصر آخر ينقله ويُفرغ الأوّل. الإجابة تُخزَّن بالصيغة نفسها السابقة (لا تغيير في الخادم).

/** يربط العنصر الأيسر `leftIdx` بالنصّ الأيمن `right` (ويُفرغ أيّ عنصر آخر كان مرتبطاً به). */
export function assignMatch(value: string[], leftIdx: number, right: string): string[] {
  return value.map((v, i) => {
    if (i === leftIdx) return right;
    return right && v === right ? "" : v;
  });
}

/** يفكّ ربط عنصر أيسر. */
export function clearMatch(value: string[], leftIdx: number): string[] {
  return value.map((v, i) => (i === leftIdx ? "" : v));
}

/** رقم العنصر الأيسر المرتبط بهذا النصّ الأيمن، أو -1. */
export function ownerOf(value: string[], right: string): number {
  return right ? value.indexOf(right) : -1;
}

/** أوّل عنصر أيسر بلا ربط بعد `after` (دائرياً)، أو null إن اكتملت كلّها. */
export function nextUnmatched(value: string[], after: number): number | null {
  const n = value.length;
  for (let step = 1; step <= n; step++) {
    const i = (after + step) % n;
    if (!value[i]) return i;
  }
  return null;
}
