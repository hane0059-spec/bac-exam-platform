// src/app/api/admin/users/[id]/purge/route.ts
// «حذف كامل» لحساب مدرّس مع كل ما أنشأه (انظر src/lib/teacherPurge.ts).
// GET  → معاينة الأعداد الحقيقية لما سيُحذف (بلا أي تعديل).
// POST { confirmName } → ينفّذ ضمن ميزانية زمنية؛ إن لم ينتهِ يعيد done:false فيكرّر العميل الطلب.
// الحراسة: مدير (عام، أو مدرسة ضمن مؤسّسته) فقط؛ للمدرّسين فقط؛ ليس النفس ولا المدير العام. تأكيد باسم الحساب إلزاميّ.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminContext, type AdminContext } from "@/lib/admin";
import { purgeConfirmMatches, runTeacherPurge, teacherPurgePreview } from "@/lib/teacherPurge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BUDGET_MS = 40_000; // أقلّ من مهلة الدالّة بهامش لإنهاء الخطوة الجارية

async function loadTarget(ctx: AdminContext | null, id: string) {
  if (!ctx) return { error: NextResponse.json({ error: "غير مخوّل" }, { status: 401 }) } as const;
  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, schoolId: true, isSuperAdmin: true, firstName: true, lastName: true },
  });
  // عزل المؤسّسة: مدير المدرسة يدير مدرّسي مؤسّسته فقط.
  if (!target || (ctx.isSchoolManager && target.schoolId !== ctx.schoolId)) {
    return { error: NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 }) } as const;
  }
  if (target.id === ctx.session.sub)
    return { error: NextResponse.json({ error: "لا يمكنك حذف حسابك." }, { status: 400 }) } as const;
  if (target.isSuperAdmin || target.role !== "TEACHER")
    return { error: NextResponse.json({ error: "الحذف الشامل لحسابات المدرّسين فقط." }, { status: 400 }) } as const;
  return { target } as const;
}

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const r = await loadTarget(await getAdminContext(), params.id);
  if ("error" in r) return r.error;
  const preview = await teacherPurgePreview(r.target.id);
  return NextResponse.json({ preview });
}

const bodySchema = z.object({ confirmName: z.string().max(200) });

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const ctx = await getAdminContext();
  const r = await loadTarget(ctx, params.id);
  if ("error" in r) return r.error;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  if (!purgeConfirmMatches(parsed.data.confirmName, r.target.firstName, r.target.lastName)) {
    return NextResponse.json({ error: "اسم التأكيد لا يطابق اسم الحساب." }, { status: 400 });
  }

  const result = await runTeacherPurge(r.target.id, ctx!.session.sub, BUDGET_MS);
  if ("blocked" in result) return NextResponse.json({ error: result.blocked }, { status: 409 });
  return NextResponse.json(result);
}
