// src/lib/admin.ts
// حراسة المدير.
import { getSession } from "@/lib/session";
import type { SessionData } from "@/lib/auth";

export async function getAdminSession(): Promise<SessionData | null> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return null;
  return session;
}
