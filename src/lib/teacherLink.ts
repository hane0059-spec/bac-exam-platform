// src/lib/teacherLink.ts
// رابط عامّ ثابت لصفحة اختبارات مدرّس: `<رمز المدرّس>.<توقيع>`. التوقيع HMAC بسرّ
// المنصّة، فلا يمكن تخمين روابط المدرّسين الآخرين (رموز المدرّسين تسلسلية).
import { createHmac, timingSafeEqual } from "node:crypto";

function sign(employeeCode: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET غير مضبوط");
  return createHmac("sha256", secret)
    .update(`teacher-page:${employeeCode}`)
    .digest("base64url")
    .slice(0, 12);
}

export function teacherLinkToken(employeeCode: string): string {
  return `${employeeCode}.${sign(employeeCode)}`;
}

/** يُعيد رمز المدرّس إن كان التوقيع صحيحاً، وإلا null. */
export function verifyTeacherLinkToken(token: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const code = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(code);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return code;
}
