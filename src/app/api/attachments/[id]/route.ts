// src/app/api/attachments/[id]/route.ts
// GET: بثّ مرفق (صورة/PDF) بعد فحص الملكية — لا روابط عامّة (خصوصية القُصّر).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canAccessAttachment } from "@/lib/attachments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });

  const att = await prisma.attachment.findUnique({
    where: { id: params.id },
    select: {
      kind: true,
      mimeType: true,
      data: true,
      quizId: true,
      sessionId: true,
      questionId: true,
      uploadedById: true,
    },
  });
  if (!att) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  if (!(await canAccessAttachment(session, att)))
    return NextResponse.json({ error: "غير مخوّل" }, { status: 403 });

  return new NextResponse(new Uint8Array(att.data), {
    headers: {
      "Content-Type": att.mimeType,
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
    },
  });
}
