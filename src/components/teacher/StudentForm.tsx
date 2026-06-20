"use client";
// src/components/teacher/StudentForm.tsx
// نموذج إنشاء/تعديل بيانات طالب. الجنس واسم الأب إجباريان؛ البريد اختياري؛
// رمز الطالب يُولَّد تلقائياً (غير قابل للتعديل).
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FieldDef } from "@/lib/customFields";
import CustomFieldsInput from "@/components/CustomFieldsInput";
import CreatorNotesField from "@/components/CreatorNotesField";

interface Option {
  id: string;
  name: string;
}
export interface StudentInitial {
  firstName: string;
  lastName: string;
  fatherName: string;
  motherName: string;
  gender: "MALE" | "FEMALE";
  gradeLevelId: string;
  address: string;
  studentPhone: string;
  parentPhone: string;
  isActive: boolean;
  email: string;
  studentCode: string;
  creatorNotes?: string;
  canEditNotes?: boolean;
}

export default function StudentForm({
  mode,
  studentId,
  subjects,
  gradeLevels,
  initial,
  createEndpoint = "/api/teacher/students",
  updateEndpoint = "/api/teacher/students",
  redirectTo = "/teacher/students",
  showSubject = true,
  customFields = [],
}: {
  mode: "create" | "edit";
  studentId?: string;
  subjects: Option[];
  gradeLevels: Option[];
  initial?: StudentInitial;
  createEndpoint?: string;
  updateEndpoint?: string;
  redirectTo?: string;
  showSubject?: boolean;
  customFields?: FieldDef[];
}) {
  const router = useRouter();
  const [customData, setCustomData] = useState<Record<string, string>>({});

  const [email, setEmail] = useState(initial?.email ?? "");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState(initial?.firstName ?? "");
  const [lastName, setLastName] = useState(initial?.lastName ?? "");
  const [fatherName, setFatherName] = useState(initial?.fatherName ?? "");
  const [motherName, setMotherName] = useState(initial?.motherName ?? "");
  const [gender, setGender] = useState<"MALE" | "FEMALE">(
    initial?.gender ?? "MALE"
  );
  const [gradeLevelId, setGradeLevelId] = useState(
    initial?.gradeLevelId ?? gradeLevels[0]?.id ?? ""
  );
  const [address, setAddress] = useState(initial?.address ?? "");
  const [studentPhone, setStudentPhone] = useState(initial?.studentPhone ?? "");
  const [parentPhone, setParentPhone] = useState(initial?.parentPhone ?? "");
  const [enrollmentYear, setEnrollmentYear] = useState(
    new Date().getFullYear()
  );
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [creatorNotes, setCreatorNotes] = useState(initial?.creatorNotes ?? "");

  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  function copyParentToStudent() {
    setStudentPhone(parentPhone);
  }

  async function submit() {
    setError("");
    setSaved(false);
    setBusy(true);
    const common = {
      email,
      firstName,
      lastName,
      fatherName,
      motherName,
      gender,
      gradeLevelId,
      address,
      studentPhone,
      parentPhone,
      creatorNotes,
    };
    const url =
      mode === "create"
        ? createEndpoint
        : `${updateEndpoint}/${studentId}`;
    const payload =
      mode === "create"
        ? {
            ...common,
            password,
            enrollmentYear: Number(enrollmentYear),
            customData,
            ...(showSubject ? { subjectId } : {}),
          }
        : { ...common, isActive };
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
      router.push(redirectTo);
      router.refresh();
    } else {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <div className="card max-w-2xl space-y-4 p-6">
      {mode === "edit" && initial && (
        <p className="text-sm text-ink/50">
          رمز الطالب: <span className="font-medium text-ink/80">{initial.studentCode}</span>
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="الاسم الأول" value={firstName} onChange={setFirstName} />
        <Field label="الاسم الأخير" value={lastName} onChange={setLastName} />
        <Field label="اسم الأب" value={fatherName} onChange={setFatherName} />
        <Field
          label="اسم الأم (اختياري)"
          value={motherName}
          onChange={setMotherName}
        />
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

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="البريد الإلكتروني (اختياري)"
          value={email}
          onChange={setEmail}
          dir="ltr"
          type="email"
        />
        {mode === "create" && (
          <Field
            label="كلمة السرّ"
            value={password}
            onChange={setPassword}
            dir="ltr"
            type="text"
            placeholder="6 أحرف على الأقل"
          />
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">
            هاتف ولي الأمر
          </label>
          <input
            dir="ltr"
            className="field"
            value={parentPhone}
            onChange={(e) => setParentPhone(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 flex items-center justify-between text-sm font-medium">
            <span>هاتف الطالب</span>
            <button
              type="button"
              onClick={copyParentToStudent}
              className="text-xs text-primary hover:underline"
            >
              نفس هاتف ولي الأمر
            </button>
          </label>
          <input
            dir="ltr"
            className="field"
            value={studentPhone}
            onChange={(e) => setStudentPhone(e.target.value)}
          />
        </div>
      </div>

      <Field
        label="العنوان (اختياري)"
        value={address}
        onChange={setAddress}
      />

      {mode === "create" && customFields.length > 0 && (
        <CustomFieldsInput
          defs={customFields}
          value={customData}
          onChange={setCustomData}
        />
      )}

      {mode === "create" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">سنة التسجيل</label>
            <input
              type="number"
              className="field"
              value={enrollmentYear}
              onChange={(e) => setEnrollmentYear(Number(e.target.value))}
            />
          </div>
          {showSubject && (
            <div>
              <label className="mb-1 block text-sm font-medium">
                المادة (للتسجيل)
              </label>
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
          )}
        </div>
      )}

      {mode === "edit" && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="accent-primary"
          />
          الحساب مُفعّل
        </label>
      )}

      {(mode === "create" || initial?.canEditNotes) && (
        <CreatorNotesField
          value={creatorNotes}
          onChange={setCreatorNotes}
          about="هذا الطالب"
        />
      )}

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
          onClick={() => router.push(redirectTo)}
          className="rounded-xl border border-line px-5 py-3 font-medium hover:bg-ink/5"
        >
          رجوع
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  dir,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  dir?: "ltr" | "rtl";
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <input
        type={type}
        dir={dir}
        className="field"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
