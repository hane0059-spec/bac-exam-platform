// src/app/api/account/password/route.ts
// POST: تغيير المستخدم كلمة سرّه بنفسه (يلزم كلمة السر الحالية). لأي دور.
import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPasswordFor, verifyPasswordFor } from "@/lib/passwords";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  currentPassword: z.string().min(1, "كلمة السر الحالية مطلوبة"),
  newPassword: z.string().min(6, "كلمة السر الجديدة 6 أحرف على الأقل"),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { passwordHash: true, role: true },
  });
  if (!user)
    return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });

  const check = await verifyPasswordFor(user.role, parsed.data.currentPassword, user.passwordHash);
  if (!check.ok)
    return NextResponse.json(
      { error: "كلمة السر الحالية غير صحيحة." },
      { status: 400 },
    );

  const passwordHash = await hashPasswordFor(user.role, parsed.data.newPassword);
  await prisma.user.update({
    where: { id: session.sub },
    data: { passwordHash, mustChangePassword: false },
  });
  return NextResponse.json({ ok: true });
}
