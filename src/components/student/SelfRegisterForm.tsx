"use client";
// src/components/student/SelfRegisterForm.tsx
// نموذج التسجيل الذاتي للطالب عبر رمز QR اختبار — يُنشئ حسابه عند مدرّس الاختبار.
import { useState } from "react";
import PasswordInput from "@/components/PasswordInput";

export default function SelfRegisterForm({
  code,
  quizTitle,
  subjectName,
  teacherName,
}: {
  code: string;
  quizTitle: string;
  subjectName: string;
  teacherName: string;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE">("MALE");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ studentCode: string } | null>(null);

  async function submit() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/join/${encodeURIComponent(code)}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          fatherName,
          gender,
          password,
          phone: phone || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "تعذّر التسجيل.");
        return;
      }
      setDone({ studentCode: data.studentCode });
    } catch {
      setError("تعذّر الاتصال بالخادم.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card space-y-4 p-6 text-center">
        <p className="text-lg font-bold text-primary-dark">تمّ إنشاء حسابك ✓</p>
        <p className="text-sm text-ink/70">
          رمزك للدخول لاحقاً (احفظه أو صوّره):
        </p>
        <p
          dir="ltr"
          className="mx-auto w-fit rounded-xl bg-primary-light px-6 py-3 text-2xl font-bold tracking-wider"
        >
          {done.studentCode}
        </p>
        <p className="text-xs text-ink/50">
          تدخل بهذا الرمز (أو باسمك الكامل) مع كلمة السرّ التي اخترتها.
        </p>
        <a href="/student/quizzes" className="btn-primary inline-block">
          ابدأ من اختباراتي ←
        </a>
      </div>
    );
  }

  const ready =
    firstName.trim() && lastName.trim() && fatherName.trim() && password.length >= 6;

  return (
    <div className="card space-y-4 p-6">
      <div className="text-center">
        <h1 className="font-display text-xl font-bold">التسجيل في الاختبار</h1>
        <p className="mt-1 text-sm text-ink/60">
          «{quizTitle}» — {subjectName}
        </p>
        <p className="text-sm text-ink/60">مع المدرّس: {teacherName}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">الاسم الأول</label>
          <input className="field" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">الاسم الأخير</label>
          <input className="field" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">اسم الأب</label>
        <input className="field" value={fatherName} onChange={(e) => setFatherName(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">الجنس</label>
          <select
            className="field"
            value={gender}
            onChange={(e) => setGender(e.target.value as "MALE" | "FEMALE")}
          >
            <option value="MALE">ذكر</option>
            <option value="FEMALE">أنثى</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">الهاتف (اختياري)</label>
          <input dir="ltr" className="field" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">كلمة السرّ (6 أحرف على الأقلّ)</label>
        <PasswordInput
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          placeholder="••••••••"
          onEnter={() => ready && !busy && submit()}
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <button
        type="button"
        className="btn-primary w-full"
        disabled={!ready || busy}
        onClick={submit}
      >
        {busy ? "جارٍ التسجيل…" : "سجّلني وابدأ"}
      </button>
    </div>
  );
}
