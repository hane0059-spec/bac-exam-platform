// src/lib/studentCredentials.ts
// تسهيل دخول الطلاب (دوال نقيّة، آمنة للعميل): رمز الطالب مرن الكتابة، وكلمة سرّ الطالب لا تتأثّر
// بحالة الأحرف. التجزئة والتحقّق (bcrypt) في `passwords.ts`.

// محارف غير مرئية (اتجاه/عرض صفري/BOM) تدخل مع النسخ واللصق من واتساب وغيره.
const INVISIBLE = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

/** أرقام عربية-هندية (٠-٩) وفارسية (۰-۹) → لاتينية. */
export function normalizeDigits(s: string): string {
  return s
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/**
 * صيغ رمز الطالب/المدرّس المحتملة لما كتبه المستخدم: كما كُتب، ثم صيغة موحَّدة
 * `حروف-أرقام` بأحرف كبيرة (s1002 / S 1002 / s_1002 / ‏S-١٠٠٢ → S-1002).
 * الأرقام وحدها ← رمز طالب (S-1002)، أمّا المدرّس فيكتب T-… أو t1002.
 */
export function codeCandidates(identifier: string): string[] {
  const raw = identifier.replace(INVISIBLE, "").trim();
  const norm = normalizeDigits(raw).toUpperCase();
  const out = new Set<string>([raw, norm]);
  const m = norm.match(/^([A-Z]+)[\s_\-–—]*([0-9]+)$/);
  if (m) out.add(`${m[1]}-${m[2]}`);
  if (/^[0-9]+$/.test(norm)) out.add(`S-${norm}`);
  return [...out];
}

/** الصيغة الموحَّدة لكلمة سرّ الطالب: أرقام لاتينية، بلا محارف خفيّة/فراغات طرفية، أحرف صغيرة. */
export function normalizeStudentPassword(p: string): string {
  return normalizeDigits(p).replace(INVISIBLE, "").trim().toLowerCase();
}

// أحرف صغيرة وأرقام بلا متشابهات (بلا i / l / o / 0 / 1).
const PASSWORD_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";

/** كلمة سرّ مؤقّتة للطالب: أحرف صغيرة وأرقام واضحة فقط. */
export function generateStudentPassword(len = 6): string {
  const buf = new Uint32Array(len);
  globalThis.crypto.getRandomValues(buf);
  let out = "";
  for (let i = 0; i < len; i++) out += PASSWORD_CHARS[buf[i] % PASSWORD_CHARS.length];
  return out;
}
