// src/app/api/join/[code]/register/route.ts
// POST: تسجيل طالب جديد ذاتياً عبر رمز QR اختبار — عامّ (بلا جلسة)، محدود المعدّل.
import { NextResponse } from "next/server";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import {
  registerStudentViaQuiz,
  selfRegisterSchema,
} from "@/lib/selfRegister";
import {
  createSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { code: string } },
) {
  // ضدّ الإنشاء الجماعي للحسابات: 8 تسجيلات كل ساعة لكل عنوان.
  if (!checkRateLimit(`self-register:${clientIp(req)}`, 8, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "محاولات كثيرة — انتظر قليلاً ثم أعد المحاولة." },
      { status: 429 },
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const parsed = selfRegisterSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 },
    );
  }

  const result = await registerStudentViaQuiz(params.code, parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  // تسجيل دخول تلقائي ليتابع الطالب مباشرة.
  const token = await createSessionToken({
    userId: result.studentId,
    role: "STUDENT",
    gender: result.gender,
    firstName: result.firstName,
    lastName: result.lastName,
  });
  const res = NextResponse.json({
    ok: true,
    studentCode: result.studentCode,
    quizTitle: result.quizTitle,
    quizId: result.quizId,
  });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}
