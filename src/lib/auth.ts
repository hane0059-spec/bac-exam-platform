// src/lib/auth.ts
// توقيع/تحقق JWT عبر jose. يعمل في بيئة Edge (middleware) وNode.
// الجلسة تحمل: المعرّف، الدور، الجنس، الاسم — لتفادي استعلامات متكررة.

import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export const SESSION_COOKIE = "session";
const ALG = "HS256";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 أيام

export type Role = "ADMIN" | "TEACHER" | "STUDENT";
export type Gender = "MALE" | "FEMALE";

export interface SessionData extends JWTPayload {
  sub: string; // userId
  role: Role;
  gender: Gender;
  firstName: string;
  lastName: string;
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET مفقود أو قصير. ضَع قيمة طويلة وعشوائية في ملف .env"
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(data: {
  userId: string;
  role: Role;
  gender: Gender;
  firstName: string;
  lastName: string;
}): Promise<string> {
  return new SignJWT({
    role: data.role,
    gender: data.gender,
    firstName: data.firstName,
    lastName: data.lastName,
  })
    .setProtectedHeader({ alg: ALG })
    .setSubject(data.userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string
): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: [ALG],
    });
    if (
      typeof payload.sub === "string" &&
      typeof payload.role === "string" &&
      typeof payload.gender === "string"
    ) {
      return payload as SessionData;
    }
    return null;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};

// المسار الافتراضي للوحة كل دور.
export function dashboardPath(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "TEACHER":
      return "/teacher";
    case "STUDENT":
      return "/student";
  }
}
