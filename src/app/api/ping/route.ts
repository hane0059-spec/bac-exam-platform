// src/app/api/ping/route.ts
// POST: نبضة خفيفة من صفحة مفتوحة تُحدّث «آخر ظهور» (صفحات اللوحات لا تطلب الخادم وهي مفتوحة ساكنة،
// فكان المستخدم المتصفّح من الموبايل لا يظهر «متصلاً الآن»). التقييد بدقيقة في touchLastSeen.
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { touchLastSeen } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getSession();
  if (!session) return new NextResponse(null, { status: 204 });
  const u = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { isActive: true, lastSeenAt: true },
  });
  if (u?.isActive) touchLastSeen(session.sub, u.lastSeenAt);
  return new NextResponse(null, { status: 204 });
}
