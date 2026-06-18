// src/lib/admin.ts
// حراسة المدير وهرميته.
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import type { SessionData } from "@/lib/auth";

export async function getAdminSession(): Promise<SessionData | null> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return null;
  return session;
}

/** هل المستخدم مدير عام (صلاحية كاملة على المدراء والإعدادات)؟ */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, isSuperAdmin: true },
  });
  return !!u && u.role === "ADMIN" && u.isSuperAdmin;
}
