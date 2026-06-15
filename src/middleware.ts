// src/middleware.ts
// حماية المسارات حسب الدور. يعمل في بيئة Edge (jose متوافق).
import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  verifySessionToken,
  dashboardPath,
  type Role,
} from "@/lib/auth";

// خريطة بادئة المسار ← الدور المطلوب
const ROLE_PREFIX: { prefix: string; role: Role }[] = [
  { prefix: "/admin", role: "ADMIN" },
  { prefix: "/teacher", role: "TEACHER" },
  { prefix: "/student", role: "STUDENT" },
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  // صفحة الدخول: المسجَّل دخوله يُحوَّل إلى لوحته.
  if (pathname === "/login") {
    if (session) {
      return NextResponse.redirect(
        new URL(dashboardPath(session.role), req.url)
      );
    }
    return NextResponse.next();
  }

  // الجذر: توجيه حسب الحالة.
  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(session ? dashboardPath(session.role) : "/login", req.url)
    );
  }

  // المسارات المحمية حسب الدور.
  const match = ROLE_PREFIX.find((r) => pathname.startsWith(r.prefix));
  if (match) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (session.role !== match.role) {
      // دور خاطئ → لوحته الصحيحة.
      return NextResponse.redirect(
        new URL(dashboardPath(session.role), req.url)
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  // استثناء ملفات النظام والـ API والأصول الثابتة.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
