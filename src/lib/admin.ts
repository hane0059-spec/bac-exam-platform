// src/lib/admin.ts
// حراسة المدير وهرميته.
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import type { SessionData } from "@/lib/auth";

/** جلسة مدير صالحة أو null. يتحقّق من isActive لمنع وصول المعطَّلين. */
export async function getAdminSession(): Promise<SessionData | null> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return null;
  const u = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { isActive: true },
  });
  if (!u?.isActive) return null;
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

export interface AdminContext {
  session: SessionData;
  schoolId: string | null; // مؤسّسة المدير (null = على مستوى المنصّة)
  isSuper: boolean; // مدير عام للمنصّة (schoolId=null + isSuperAdmin)
  isSchoolManager: boolean; // مدير مدرسة (schoolId مضبوط)
}

/** سياق المدير: مؤسّسته ومستواه — لعزل الاستعلامات. استعلام DB واحد يجمع الفحوص. */
export async function getAdminContext(): Promise<AdminContext | null> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return null;
  const u = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { isSuperAdmin: true, schoolId: true, isActive: true },
  });
  if (!u || !u.isActive) return null;
  return {
    session,
    schoolId: u.schoolId,
    isSuper: u.schoolId === null && u.isSuperAdmin,
    isSchoolManager: u.schoolId !== null,
  };
}
