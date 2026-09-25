// src/app/join/[code]/page.tsx
// صفحة عامّة يفتحها رمز QR للاختبار: الطالب المسجَّل يُوجَّه للانضمام، وغير
// المسجَّل يسجّل حسابه ذاتياً عند مدرّس الاختبار (إن فعّل ذلك).
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getBranding } from "@/lib/branding";
import { findSelfRegisterQuiz } from "@/lib/selfRegister";
import BrandLogo from "@/components/BrandLogo";
import SelfRegisterForm from "@/components/student/SelfRegisterForm";

export const dynamic = "force-dynamic";

export default async function JoinPage({ params }: { params: { code: string } }) {
  const session = await getSession();
  if (session?.role === "STUDENT") {
    redirect(`/student/quizzes?join=${encodeURIComponent(params.code)}`);
  }

  const [branding, quiz] = await Promise.all([
    getBranding(),
    session ? Promise.resolve(null) : findSelfRegisterQuiz(params.code),
  ]);

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 py-8">
      <div className="mb-6 flex items-center justify-center gap-2.5">
        <BrandLogo size={40} hasLogo={branding.hasLogo} />
        <span className="font-display text-lg font-bold">{branding.name}</span>
      </div>

      {session ? (
        <div className="card p-6 text-center text-ink/70">
          أنت مسجَّل دخولك بحساب غير طالب. للانضمام إلى الاختبار اخرج ثم ادخل
          بحساب طالب.
          <div className="mt-4">
            <Link href="/" className="text-primary hover:underline">
              العودة للوحتي
            </Link>
          </div>
        </div>
      ) : quiz ? (
        <>
          <div className="card mb-4 space-y-2 p-5 text-center">
            <p className="text-sm text-ink/70">
              لديك حساب في المنصّة؟ سجّل دخولك وستدخل الاختبار مباشرة.
            </p>
            <Link
              href={`/login?next=${encodeURIComponent(`/join/${params.code}`)}`}
              className="btn-primary inline-block"
            >
              لديّ حساب — تسجيل الدخول
            </Link>
          </div>
        <SelfRegisterForm
          code={params.code}
          quizTitle={quiz.title}
          subjectName={quiz.subject.name}
          teacherName={`${quiz.creator.firstName} ${quiz.creator.lastName}`}
        />
        </>
      ) : (
        <div className="card p-6 text-center">
          <p className="mb-3 text-ink/70">
            التسجيل الذاتي عبر هذا الرمز غير متاح. إن كان لديك حساب فادخل به ثم
            أدخل رمز الاختبار في «اختباراتي».
          </p>
          <Link
            href={`/login?next=${encodeURIComponent(`/join/${params.code}`)}`}
            className="btn-primary inline-block"
          >
            تسجيل الدخول
          </Link>
        </div>
      )}
    </main>
  );
}
