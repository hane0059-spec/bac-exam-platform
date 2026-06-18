// src/lib/tempPassword.ts
// توليد كلمة سرّ مؤقّتة سهلة القراءة والنطق (للمدرّس/المدير ليسلّمها للطالب).
// نمط: مقطعان (ساكن+حركة) + شرطة + 3 أرقام → مثل "mako-372" (8 محارف، ≥6).
const CONSONANTS = "bcdfghjkmnprstvwxz"; // بلا حروف ملتبسة (l/q…)
const VOWELS = "aeu"; // بلا o (تلتبس مع 0)
const DIGITS = "23456789"; // بلا 0/1

function pick(set: string): string {
  return set[Math.floor(Math.random() * set.length)];
}

export function generateTempPassword(): string {
  let s = "";
  for (let i = 0; i < 2; i++) s += pick(CONSONANTS) + pick(VOWELS);
  let d = "";
  for (let i = 0; i < 3; i++) d += pick(DIGITS);
  return `${s}-${d}`;
}
