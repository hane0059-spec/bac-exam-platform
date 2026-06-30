// src/middleware.ts
// حماية المسارات حسب الدور. يعمل في بيئة Edge (jose متوافق).
import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  verifySessionToken,
  createSessionToken,
  sessionCookieOptions,
  dashboardPath,
  MAX_AGE_SECONDS,
  type Role,
} from "@/lib/auth";

// خريطة بادئة المسار ← الدور المطلوب
const ROLE_PREFIX: { prefix: string; role: Role }[] = [
  { prefix: "/admin", role: "ADMIN" },
  { prefix: "/teacher", role: "TEACHER" },
  { prefix: "/student", role: "STUDENT" },
  { prefix: "/parent", role: "PARENT" },
];

// تجديد منزلق: إن تبقّى أقل من يومين على انتهاء الجلسة، تُعاد إصدار الكوكي
// بمدّة كاملة جديدة طالما المستخدم نشط — يتفادى انتهاء الجلسة المفاجئ.
const RENEW_THRESHOLD_SECONDS = 60 * 60 * 24 * 2;

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

  // المسارات المحمية حسب الدور (مطابقة على حدّ المقطع لا مجرّد البادئة،
  // حتى لا يُعتبر مثل "/student_import_template.xlsx" مسارَ طالب).
  const match = ROLE_PREFIX.find(
    (r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/")
  );
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

  const res = NextResponse.next();

  // تجديد الجلسة منزلقاً إن اقترب انتهاؤها وما زال المستخدم نشطاً.
  if (session && typeof session.iat === "number") {
    const ageSeconds = Date.now() / 1000 - session.iat;
    if (ageSeconds > MAX_AGE_SECONDS - RENEW_THRESHOLD_SECONDS) {
      const fresh = await createSessionToken({
        userId: session.sub,
        role: session.role,
        gender: session.gender,
        firstName: session.firstName,
        lastName: session.lastName,
      });
      res.cookies.set(SESSION_COOKIE, fresh, sessionCookieOptions);
    }
  }

  return res;
}

export const config = {
  // استثناء الـ API وملفات النظام وأي مسار يحوي امتداداً (أصول public).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
