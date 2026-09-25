// src/app/t/[token]/page.tsx
// صفحة عامّة لمدرّس: اختباراته المنشورة المفتوحة للانضمام بالرمز. يُدخَل إليها
// برابط موقَّع (لا تخمين). يُعرَض اسم المدرّس والاختبارات فقط.
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getBranding } from "@/lib/branding";
import { verifyTeacherLinkToken } from "@/lib/teacherLink";
import BrandLogo from "@/components/BrandLogo";

export const dynamic = "force-dynamic";

export default async function TeacherQuizzesPublicPage({
  params,
}: {
  params: { token: string };
}) {
  const branding = await getBranding();
  let decoded = params.token;
  try {
    decoded = decodeURIComponent(params.token);
  } catch {
    // يبقى كما هو ← سيفشل التحقّق.
  }
  const code = verifyTeacherLinkToken(decoded);

  const profile = code
    ? await prisma.teacherProfile.findUnique({
        where: { employeeCode: code },
        select: {
          user: {
            select: { id: true, firstName: true, lastName: true, isActive: true, role: true },
          },
        },
      })
    : null;
  const teacher =
    profile && profile.user.isActive && profile.user.role === "TEACHER"
      ? profile.user
      : null;

  const now = new Date();
  const quizzes = teacher
    ? (
        await prisma.quiz.findMany({
          where: {
            creatorId: teacher.id,
            status: "PUBLISHED",
            allowCodeJoin: true,
            accessCode: { not: null },
            AND: [
              { OR: [{ availableFrom: null }, { availableFrom: { lte: now } }] },
              { OR: [{ availableUntil: null }, { availableUntil: { gt: now } }] },
            ],
          },
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            title: true,
            description: true,
            accessCode: true,
            settings: true,
            subject: { select: { name: true } },
          },
        })
      ).filter(
        (q) =>
          !(
            q.settings &&
            typeof q.settings === "object" &&
            (q.settings as Record<string, unknown>).purged
          ),
      )
    : [];

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-center gap-2.5">
        <BrandLogo size={40} hasLogo={branding.hasLogo} />
        <span className="font-display text-lg font-bold">{branding.name}</span>
      </div>

      {!teacher ? (
        <div className="card p-8 text-center text-ink/70">
          هذا الرابط غير صالح.
          <div className="mt-4">
            <Link href="/login" className="text-primary hover:underline">
              تسجيل الدخول
            </Link>
          </div>
        </div>
      ) : (
        <>
          <h1 className="mb-1 text-center font-display text-2xl font-bold">
            اختبارات {teacher.firstName} {teacher.lastName}
          </h1>
          <p className="mb-6 text-center text-sm text-ink/60">
            اختر الاختبار للدخول إليه. إن لم يكن لديك حساب ستُنشئه في الخطوة التالية
            (إن أتاح المدرّس ذلك).
          </p>
          {quizzes.length === 0 ? (
            <div className="card p-8 text-center text-ink/60">
              لا اختبارات متاحة حالياً. عُد لاحقاً.
            </div>
          ) : (
            <div className="space-y-3">
              {quizzes.map((q) => (
                <Link
                  key={q.id}
                  href={`/join/${q.accessCode}`}
                  className="card flex flex-wrap items-center justify-between gap-3 p-4 transition hover:border-primary/40"
                >
                  <div className="min-w-0">
                    <p className="font-display font-semibold">{q.title}</p>
                    <p className="mt-0.5 text-sm text-ink/60">{q.subject.name}</p>
                    {q.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-ink/50">{q.description}</p>
                    )}
                  </div>
                  <span className="btn-primary shrink-0 px-4 py-1.5 text-sm">
                    ادخل الاختبار ←
                  </span>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
