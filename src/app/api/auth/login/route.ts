// src/app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
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
  email: z.string().email("بريد إلكتروني غير صالح"),
  password: z.string().min(1, "كلمة السر مطلوبة"),
});

export async function POST(req: Request) {
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

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  // رسالة موحّدة لتفادي كشف وجود الحساب.
  const invalid = NextResponse.json(
    { error: "البريد الإلكتروني أو كلمة السر غير صحيحة" },
    { status: 401 }
  );

  if (!user || !user.isActive) return invalid;

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return invalid;

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
