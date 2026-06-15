"use client";
// src/components/teacher/StudentForm.tsx
// نموذج إنشاء/تعديل بيانات طالب. الجنس إلزامي.
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Option {
  id: string;
  name: string;
}
export interface StudentInitial {
  firstName: string;
  lastName: string;
  gender: "MALE" | "FEMALE";
  gradeLevelId: string;
  parentPhone: string;
  isActive: boolean;
  email: string;
  studentCode: string;
}

export default function StudentForm({
  mode,
  studentId,
  subjects,
  gradeLevels,
  initial,
}: {
  mode: "create" | "edit";
  studentId?: string;
  subjects: Option[];
  gradeLevels: Option[];
  initial?: StudentInitial;
}) {
  const router = useRouter();

  const [email, setEmail] = useState(initial?.email ?? "");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState(initial?.firstName ?? "");
  const [lastName, setLastName] = useState(initial?.lastName ?? "");
  const [gender, setGender] = useState<"MALE" | "FEMALE">(
    initial?.gender ?? "MALE"
  );
  const [studentCode, setStudentCode] = useState(initial?.studentCode ?? "");
  const [gradeLevelId, setGradeLevelId] = useState(
    initial?.gradeLevelId ?? gradeLevels[0]?.id ?? ""
  );
  const [parentPhone, setParentPhone] = useState(initial?.parentPhone ?? "");
  const [enrollmentYear, setEnrollmentYear] = useState(
    new Date().getFullYear()
  );
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError("");
    setSaved(false);
    setBusy(true);
    const url =
      mode === "create"
        ? "/api/teacher/students"
        : `/api/teacher/students/${studentId}`;
    const payload =
      mode === "create"
        ? {
            email,
            password,
            firstName,
            lastName,
            gender,
            studentCode,
            gradeLevelId,
            parentPhone,
            enrollmentYear: Number(enrollmentYear),
            subjectId,
          }
        : { firstName, lastName, gender, gradeLevelId, parentPhone, isActive };
    const res = await fetch(url, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "تعذّر الحفظ.");
      return;
    }
    if (mode === "create") {
      router.push("/teacher/students");
      router.refresh();
    } else {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <div className="card max-w-2xl space-y-4 p-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">الاسم الأول</label>
          <input
            className="field"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">الاسم الأخير</label>
          <input
            className="field"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
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
          <label className="mb-1 block text-sm font-medium">الصفّ</label>
          <select
            className="field"
            value={gradeLevelId}
            onChange={(e) => setGradeLevelId(e.target.value)}
          >
            {gradeLevels.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {mode === "create" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                dir="ltr"
                className="field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">كلمة السرّ</label>
              <input
                type="text"
                dir="ltr"
                className="field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6 أحرف على الأقل"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">رمز الطالب</label>
              <input
                className="field"
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value)}
                placeholder="مثال: S-1002"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                سنة التسجيل
              </label>
              <input
                type="number"
                className="field"
                value={enrollmentYear}
                onChange={(e) => setEnrollmentYear(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">المادة</label>
              <select
                className="field"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">
              البريد (غير قابل للتعديل)
            </label>
            <input className="field opacity-60" dir="ltr" value={email} disabled />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">رمز الطالب</label>
            <input className="field opacity-60" value={studentCode} disabled />
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">
            هاتف ولي الأمر (اختياري)
          </label>
          <input
            dir="ltr"
            className="field"
            value={parentPhone}
            onChange={(e) => setParentPhone(e.target.value)}
          />
        </div>
        {mode === "edit" && (
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="accent-primary"
              />
              الحساب مُفعّل
            </label>
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>
      )}
      {saved && !error && (
        <p className="rounded-xl bg-primary-light p-3 text-sm text-primary-dark">
          تم الحفظ.
        </p>
      )}

      <div className="flex gap-2">
        <button onClick={submit} disabled={busy} className="btn-primary">
          {busy ? "…" : mode === "create" ? "إنشاء الطالب" : "حفظ التعديلات"}
        </button>
        <button
          onClick={() => router.push("/teacher/students")}
          className="rounded-xl border border-line px-5 py-3 font-medium hover:bg-ink/5"
        >
          رجوع
        </button>
      </div>
    </div>
  );
}
