// src/lib/activity.ts
// تحديث آخر نشاط للمستخدم — مُقيَّد بدقيقة واحدة بين كل تحديثين لتخفيف الكتابات.
import { after } from "next/server";
import { prisma } from "@/lib/prisma";

const THROTTLE_MS = 60_000; // دقيقة واحدة

export function touchLastSeen(userId: string, lastSeenAt: Date | null): void {
  const now = new Date();
  if (lastSeenAt && now.getTime() - lastSeenAt.getTime() < THROTTLE_MS) return;
  const write = () =>
    prisma.user
      .update({ where: { id: userId }, data: { lastSeenAt: now } })
      .catch(() => {}); // صامت — فشل التتبّع لا يكسر الطلب
  // على Vercel قد تُجمَّد الدالة فور إرسال الردّ فتضيع كتابة غير مُنتظَرة؛ `after` يُبقيها حيّة حتى تنتهي دون
  // تأخير الردّ. خارج نطاق طلب (نادر) نعود للإطلاق الصامت.
  try {
    after(write);
  } catch {
    void write();
  }
}
