// src/lib/matchingPrint.ts
// تخطيط سؤال المطابقة للورقة المطبوعة: جدولان متقابلان (العمود الأوّل مرقَّم بترتيبه، والثاني مخلوط بحرف لكل خانة)
// ليصل الطالب بينهما بخطّ القلم. الخلط بإزاحة دائرية عشوائية (Sattolo) فلا تقابل أيّ خانةٍ جوابَها في الصفّ نفسه،
// وببذرة ثابتة من نصّ السؤال فتثبت الورقة بين الطباعة والتصحيح.

export interface MatchingPrintLayout {
  /** عناصر العمود الأوّل بترتيب إدخال المدرّس. */
  lefts: string[];
  /** عناصر العمود الثاني بعد الخلط. */
  rights: string[];
  /** answers[i] = موضع جواب العنصر i داخل `rights`. */
  answers: number[];
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildMatchingLayout(
  pairs: { left: string; right: string }[],
  seed: string
): MatchingPrintLayout {
  const n = pairs.length;
  // order[k] = رقم الزوج الذي يُعرَض جوابه في الموضع k.
  const order = Array.from({ length: n }, (_, i) => i);
  if (n > 1) {
    const rnd = mulberry32(hashStr(seed));
    // Sattolo: دورة واحدة ← لا نقاط ثابتة.
    for (let i = n - 1; i >= 1; i--) {
      const j = Math.floor(rnd() * i);
      [order[i], order[j]] = [order[j], order[i]];
    }
  }
  const answers = new Array<number>(n);
  order.forEach((pairIdx, k) => {
    answers[pairIdx] = k;
  });
  return {
    lefts: pairs.map((p) => p.left),
    rights: order.map((idx) => pairs[idx].right),
    answers,
  };
}
