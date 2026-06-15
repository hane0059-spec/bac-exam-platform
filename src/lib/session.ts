// src/lib/session.ts
// قراءة الجلسة من الكوكي داخل المكوّنات الخادمية ومسارات API.
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken, type SessionData } from "./auth";

export async function getSession(): Promise<SessionData | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
