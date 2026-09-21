// src/app/api/admin/resources/[id]/route.ts
// DELETE: حذف ملفّ «أسئلة وإثراء» عامّ. المدير العام فقط.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const ctx = await getAdminContext();
  if (!ctx || !ctx.isSuper)
    return NextResponse.json({ error: "غير مخوّل" }, { status: 403 });

  await prisma.enrichmentFile.deleteMany({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
