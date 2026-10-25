// src/lib/passwords.ts
// تجزئة كلمات السرّ والتحقّق منها حسب الدور. الطالب فقط: كلمة السرّ تُجزَّأ بصيغتها الموحَّدة
// (أحرف صغيرة) فلا تؤثّر الأحرف الكبيرة/الصغيرة عند الدخول. باقي الأدوار بلا تغيير.
import bcrypt from "bcryptjs";
import { normalizeStudentPassword } from "@/lib/studentCredentials";

export function hashPasswordFor(role: string, plain: string): Promise<string> {
  return bcrypt.hash(role === "STUDENT" ? normalizeStudentPassword(plain) : plain, 10);
}

/**
 * يتحقّق من كلمة السرّ. للطالب: الصيغة الموحَّدة أولاً (الحسابات الجديدة/المُرحَّلة)، ثم الحالات
 * القديمة (مجزَّأة كما كُتبت، أو كبيرة كما كانت تولّدها البطاقات القديمة) — وعند نجاح قديمة تُعاد
 * `rehash` لتُحفَظ بالصيغة الموحَّدة فتصير غير حسّاسة للحالة من الدخول التالي.
 */
export async function verifyPasswordFor(
  role: string,
  plain: string,
  hash: string
): Promise<{ ok: boolean; rehash?: string }> {
  if (role !== "STUDENT") return { ok: await bcrypt.compare(plain, hash) };
  const norm = normalizeStudentPassword(plain);
  if (norm && (await bcrypt.compare(norm, hash))) return { ok: true };
  const tried = new Set<string>([norm]);
  for (const candidate of [plain, plain.toUpperCase()]) {
    if (tried.has(candidate)) continue;
    tried.add(candidate);
    if (await bcrypt.compare(candidate, hash)) {
      return { ok: true, rehash: await bcrypt.hash(norm, 10) };
    }
  }
  return { ok: false };
}
