// src/app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import {
  createSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE,
  dashboardPath,
  type Role,
  type Gender,
} from "@/lib/auth";

export const runtime = "nodejs";

const loginSchema = z.object({
  identifier: z.string().trim().min(1, "أدخل البريد أو رمز الطالب أو الاسم"),
  password: z.string().min(1, "كلمة السر مطلوبة"),
  // نافذة الدخول المختارة (اختيارية) — تُتحقّق بعد كلمة السر فقط.
  role: z.enum(["ADMIN", "TEACHER", "STUDENT", "PARENT"]).optional(),
});

const WINDOW_LABEL: Record<string, string> = {
  ADMIN: "المدراء",
  TEACHER: "المدرّسين",
  STUDENT: "الطلاب",
  PARENT: "أولياء الأمور",
};

// يحلّ المُعرّف إلى مستخدم: بريد، ثم رمز طالب، ثم اسم كامل (إن لم يلتبس).
async function resolveUser(
  identifier: string
): Promise<{ user?: User; ambiguous?: boolean }> {
  const byEmail = await prisma.user.findFirst({
    where: { email: identifier.toLowerCase() },
  });
  if (byEmail) return { user: byEmail };

  const profile = await prisma.studentProfile.findUnique({
    where: { studentCode: identifier },
    include: { user: true },
  });
  if (profile) return { user: profile.user };

  // رمز المدرّس.
  const tProfile = await prisma.teacherProfile.findUnique({
    where: { employeeCode: identifier },
    include: { user: true },
  });
  if (tProfile) return { user: tProfile.user };

  const parts = identifier.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const firstName = parts[0];
    const lastName = parts.slice(1).join(" ");
    const matches = await prisma.user.findMany({
      where: { firstName, lastName },
      take: 2,
    });
    if (matches.length === 1) return { user: matches[0] };
    if (matches.length > 1) return { ambiguous: true };
  }
  return {};
}

export async function POST(req: Request) {
  // تحديد معدّل ضدّ التخمين العنيف (best-effort لكل نسخة خادم).
  if (!checkRateLimit(`login:${clientIp(req)}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "محاولات كثيرة جداً — انتظر قليلاً ثم أعد المحاولة." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 }
    );
  }

  const { identifier, password } = parsed.data;
  const resolved = await resolveUser(identifier);

  // التباس الاسم مع أكثر من حساب: وجّه لاستخدام معرّف فريد.
  if (resolved.ambiguous) {
    return NextResponse.json(
      { error: "الاسم مطابق لأكثر من حساب — استخدم رمز الطالب أو البريد" },
      { status: 409 }
    );
  }
  const user = resolved.user;

  // رسالة موحّدة لتفادي كشف وجود الحساب.
  const invalid = NextResponse.json(
    { error: "بيانات الدخول غير صحيحة" },
    { status: 401 }
  );

  if (!user || !user.isActive) return invalid;

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return invalid;

  // تحقّق النافذة (بعد كلمة السر فقط — لا يكشف وجود الحساب لغير المُصادَق).
  if (parsed.data.role && user.role !== parsed.data.role) {
    const correct = WINDOW_LABEL[user.role] ?? "";
    return NextResponse.json(
      {
        error: `هذا الحساب ليس ضمن هذه النافذة — استخدم نافذة دخول ${correct}.`,
      },
      { status: 403 }
    );
  }

  const token = await createSessionToken({
    userId: user.id,
    role: user.role as Role,
    gender: user.gender as Gender,
    firstName: user.firstName,
    lastName: user.lastName,
  });

  const res = NextResponse.json({
    ok: true,
    redirect: dashboardPath(user.role as Role),
  });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}
