// src/app/api/admin/users/[id]/purge-attachments/route.ts
// المدير يفرّغ مرفقات مستخدمٍ مغادر (معطّل) لتحرير التخزين — تبقى الدرجات والقشور.
// عمليّة غير قابلة للتراجع: تُحذف صور الإجابات/أوراق الاختبارات/صور الأسئلة (+ تعليقاتها).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getAdminContext();
  if (!ctx) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }

  const target = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, isActive: true, schoolId: true },
  });
  if (!target) {
    return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
  }
  // عزل المؤسّسة: مدير المدرسة لمستخدمي مدرسته فقط.
  if (!ctx.isSuper && target.schoolId !== ctx.schoolId) {
    return NextResponse.json({ error: "خارج نطاق مؤسّستك" }, { status: 403 });
  }
  // أمان: التفريغ للمعطّلين فقط (عطّل المستخدم أوّلاً) كي لا تُمسّ بياناتٌ حيّة.
  if (target.isActive) {
    return NextResponse.json(
      { error: "عطّل المستخدم أوّلاً قبل تفريغ مرفقاته" },
      { status: 409 }
    );
  }

  // حجمٌ سيُحرَّر (قبل الحذف) ثمّ الحذف. التعليقات تُحذف بالتعاقب (FK Cascade).
  const agg = await prisma.attachment.aggregate({
    where: { uploadedById: target.id },
    _sum: { sizeBytes: true },
    _count: { _all: true },
  });
  const freedBytes = agg._sum.sizeBytes ?? 0;
  const count = agg._count._all;

  if (count === 0) {
    return NextResponse.json({ deletedCount: 0, freedBytes: 0 });
  }

  await prisma.attachment.deleteMany({ where: { uploadedById: target.id } });

  return NextResponse.json({ deletedCount: count, freedBytes });
}
