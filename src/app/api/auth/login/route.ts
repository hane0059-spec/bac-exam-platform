// src/app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPasswordFor } from "@/lib/passwords";
import { codeCandidates } from "@/lib/studentCredentials";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { clearThrottle, lockMessage, reserveAttempt, throttleKey } from "@/lib/loginThrottle";
import { getBranding } from "@/lib/branding";
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

// يحلّ المُعرّف إلى مستخدم: بريد / رمز طالب / رمز مدرّس (بالتوازي)، ثم اسم كامل.
async function resolveUser(
  identifier: string
): Promise<{ user?: User; ambiguous?: boolean }> {
  // البحث الثلاثة متوازية لتقليل زمن الاستجابة.
  // الرمز مرن الكتابة: s1002 / S 1002 / ١٠٠٢ ← S-1002 (انظر studentCredentials).
  const codes = codeCandidates(identifier);
  const [byEmail, profile, tProfile] = await Promise.all([
    prisma.user.findFirst({ where: { email: identifier.toLowerCase() } }),
    prisma.studentProfile.findFirst({
      where: { studentCode: { in: codes } },
      include: { user: true },
    }),
    prisma.teacherProfile.findFirst({
      where: { employeeCode: { in: codes } },
      include: { user: true },
    }),
  ]);

  const user = byEmail ?? profile?.user ?? tProfile?.user;
  if (user) return { user };

  // الاسم الكامل: احتياطي — يتطلّب جزأين على الأقل.
  // نجرّب كل تقسيمة ممكنة لدعم الأسماء المركّبة (عبد التواب / عبد الله …).
  const parts = identifier.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const allMatches: User[] = [];
    const seen = new Set<string>();
    // جرّب كل نقطة تقسيم: firstName = parts[0..i], lastName = parts[i+1..]
    for (let i = 0; i < parts.length - 1; i++) {
      const firstName = parts.slice(0, i + 1).join(" ");
      const lastName = parts.slice(i + 1).join(" ");
      const rows = await prisma.user.findMany({
        where: { firstName, lastName },
        take: 3,
      });
      for (const r of rows) {
        if (!seen.has(r.id)) { seen.add(r.id); allMatches.push(r); }
      }
      if (allMatches.length > 1) return { ambiguous: true };
    }
    if (allMatches.length === 1) return { user: allMatches[0] };
    if (allMatches.length > 1) return { ambiguous: true };
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

  // حدّ المحاولات لكل حساب (في القاعدة، يصمد عبر نسخ الخادم): تُحجَز المحاولة ذرّياً **قبل** فحص كلمة السرّ فلا
  // يتجاوز التخمين المتوازي الحدّ ولا ينجح تخمينٌ أثناء القفل، ويُعامَل المُعرّف المجهول كالموجود فلا يكشف القفل وجود الحساب.
  const tKey = throttleKey(user?.id, identifier);
  const attempt = await reserveAttempt(tKey);
  if (!attempt.allowed) {
    return NextResponse.json({ error: lockMessage(attempt.remainingMs) }, { status: 429 });
  }

  // رسالة موحّدة لتفادي كشف وجود الحساب.
  const invalid = NextResponse.json(
    { error: "بيانات الدخول غير صحيحة" },
    { status: 401 }
  );

  if (!user || !user.isActive) return invalid;

  // الطالب: كلمة السرّ غير حسّاسة لحالة الأحرف، وتُرحَّل الحسابات القديمة عند أوّل دخول ناجح.
  const check = await verifyPasswordFor(user.role, password, user.passwordHash);
  if (!check.ok) return invalid;
  await clearThrottle(tKey); // نجاح: يُصفَّر العدّاد
  if (check.rehash) {
    await prisma.user
      .update({ where: { id: user.id }, data: { passwordHash: check.rehash } })
      .catch(() => {});
  }

  // وضع الصيانة: يُمنع الدخول للجميع عدا المدير العام (ليعيد التشغيل).
  // يُفحَص بعد كلمة السر فقط كي لا يكشف وجود الحساب لغير المُصادَق.
  if (!user.isSuperAdmin) {
    const branding = await getBranding();
    if (branding.maintenance) {
      return NextResponse.json(
        {
          error:
            branding.maintenanceMessage || "المنصّة متوقّفة مؤقّتاً للصيانة.",
        },
        { status: 503 }
      );
    }
  }

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
