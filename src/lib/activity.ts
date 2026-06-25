// src/lib/activity.ts
// تحديث آخر نشاط للمستخدم — مُقيَّد بدقيقة واحدة بين كل تحديثين لتخفيف الكتابات.
import { prisma } from "@/lib/prisma";

const THROTTLE_MS = 60_000; // دقيقة واحدة

export function touchLastSeen(userId: string, lastSeenAt: Date | null): void {
  const now = new Date();
  if (lastSeenAt && now.getTime() - lastSeenAt.getTime() < THROTTLE_MS) return;
  // fire-and-forget: لا تُوقف الطلب بانتظار الكتابة.
  prisma.user
    .update({ where: { id: userId }, data: { lastSeenAt: now } })
    .catch(() => {}); // صامت — فشل التتبّع لا يكسر الطلب
}
