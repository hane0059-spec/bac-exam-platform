"use client";
// src/components/admin/UserForm.tsx
// إنشاء/تعديل حساب مدرّس أو مدير (مع ربط المواد للمدرّس).
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FieldDef } from "@/lib/customFields";
import CustomFieldsInput from "@/components/CustomFieldsInput";
import CreatorNotesField from "@/components/CreatorNotesField";
import { SOLO_MODE } from "@/lib/platformMode";

interface Subject {
  id: string;
  name: string;
}
export interface UserInitial {
  role: "TEACHER" | "ADMIN";
  firstName: string;
  lastName: string;
  gender: "MALE" | "FEMALE";
  email: string;
  isActive: boolean;
  qualification: string;
  subjectIds: string[];
  canFileExams: boolean;
  canManageStudents: boolean;
  isSuperAdmin: boolean;
  isIndependent: boolean;
  studentLimit: number | null;
  creatorNotes?: string;
  canEditNotes?: boolean; // المُنشئ وحده يرى/يعدّل ملاحظاته
}

export default function UserForm({
  mode,
  userId,
  subjects,
  initial,
  canManageAdmins,
  schools,
  customFields = [],
}: {
  mode: "create" | "edit";
  userId?: string;
  subjects: Subject[];
  initial?: UserInitial;
  canManageAdmins: boolean;
  schools?: { id: string; name: string }[];
  customFields?: FieldDef[];
}) {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState(schools?.[0]?.id ?? "");
  const [customData, setCustomData] = useState<Record<string, string>>({});
  const [role, setRole] = useState<"TEACHER" | "ADMIN">(
    initial?.role ?? "TEACHER"
  );
  const [superAdmin, setSuperAdmin] = useState(initial?.isSuperAdmin ?? false);
  const [firstName, setFirstName] = useState(initial?.firstName ?? "");
  const [lastName, setLastName] = useState(initial?.lastName ?? "");
  const [gender, setGender] = useState<"MALE" | "FEMALE">(
    initial?.gender ?? "MALE"
  );
  const [email, setEmail] = useState(initial?.email ?? "");
  const [password, setPassword] = useState("");
  const [qualification, setQualification] = useState(
    initial?.qualification ?? ""
  );
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [subjectIds, setSubjectIds] = useState<string[]>(
    initial?.subjectIds ?? []
  );
  const [canFileExams, setCanFileExams] = useState(
    initial?.canFileExams ?? false
  );
  const [canManageStudents, setCanManageStudents] = useState(
    initial?.canManageStudents ?? false
  );
  const [creatorNotes, setCreatorNotes] = useState(initial?.creatorNotes ?? "");
  // مدرّس مستقلّ (للمدير العام فقط) + حدّ طلابه. في الوضع المبسّط: دائماً مستقلّ.
  const [isIndependent, setIsIndependent] = useState(
    initial?.isIndependent ?? SOLO_MODE
  );
  const [studentLimit, setStudentLimit] = useState(
    initial?.studentLimit != null ? String(initial.studentLimit) : "20"
  );

  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const isTeacher = role === "TEACHER";
  const roleOptions: ["TEACHER" | "ADMIN", string][] = canManageAdmins
    ? [
        ["TEACHER", "مدرّس"],
        ["ADMIN", "مدير"],
      ]
    : [["TEACHER", "مدرّس"]];

  function toggleSubject(id: string) {
    setSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function submit() {
    setError("");
    setSaved(false);
    setBusy(true);
    const url =
      mode === "create" ? "/api/admin/users" : `/api/admin/users/${userId}`;
    const payload =
      mode === "create"
        ? {
            role,
            firstName,
            lastName,
            gender,
            email,
            password,
            qualification,
            subjectIds: isTeacher ? subjectIds : [],
            canFileExams: isTeacher ? canFileExams : false,
            canManageStudents: isTeacher ? canManageStudents : false,
            isSuperAdmin: role === "ADMIN" ? superAdmin : false,
            schoolId: schools ? schoolId || null : undefined,
            isIndependent: isTeacher && canManageAdmins ? isIndependent : false,
            studentLimit:
              isTeacher && canManageAdmins && isIndependent
                ? Number(studentLimit)
                : null,
            creatorNotes,
            customData,
          }
        : {
            firstName,
            lastName,
            gender,
            email,
            isActive,
            qualification,
            subjectIds: isTeacher ? subjectIds : [],
            canFileExams: isTeacher ? canFileExams : false,
            canManageStudents: isTeacher ? canManageStudents : false,
            isSuperAdmin: role === "ADMIN" ? superAdmin : false,
            studentLimit:
              isTeacher && canManageAdmins && initial?.isIndependent
                ? Number(studentLimit)
                : null,
            creatorNotes,
          };
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
      router.push("/admin/users");
      router.refresh();
    } else {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <div className="card max-w-2xl space-y-4 p-6">
      {mode === "create" && !SOLO_MODE && (
        <div>
          <label className="mb-1 block text-sm font-medium">نوع الحساب</label>
          <div className="flex gap-2">
            {roleOptions.map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setRole(v)}
                className={`rounded-xl border px-4 py-2 text-sm transition ${
                  role === v
                    ? "border-primary bg-primary-light text-primary-dark"
                    : "border-line hover:border-primary/40"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {schools && mode === "create" && !(isTeacher && isIndependent) && (
        <div>
          <label className="mb-1 block text-sm font-medium">
            {role === "ADMIN" ? "المؤسّسة التي يديرها" : "المؤسّسة"}
          </label>
          <select
            className="field"
            value={schoolId}
            onChange={(e) => setSchoolId(e.target.value)}
          >
            <option value="">— بلا مؤسّسة (مستوى المنصّة) —</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {role === "ADMIN" && canManageAdmins && !schoolId && (
        <label className="flex items-center gap-2 rounded-xl bg-gold/10 p-3 text-sm">
          <input
            type="checkbox"
            checked={superAdmin}
            onChange={(e) => setSuperAdmin(e.target.checked)}
            className="accent-primary"
          />
          مدير عام للمنصّة (صلاحية كاملة)
        </label>
      )}

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
          <label className="mb-1 block text-sm font-medium">
            البريد الإلكتروني (اختياري)
          </label>
          <input
            type="email"
            dir="ltr"
            className="field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      {mode === "create" && (
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
      )}

      {isTeacher && (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium">
              المؤهّل (اختياري)
            </label>
            <input
              className="field"
              value={qualification}
              onChange={(e) => setQualification(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              المواد التي يدرّسها
            </label>
            {subjects.length === 0 ? (
              <p className="text-sm text-ink/50">
                لا مواد بعد — أضِفها من «المواد والصفوف».
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {subjects.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-2 rounded-xl border border-line p-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={subjectIds.includes(s.id)}
                      onChange={() => toggleSubject(s.id)}
                      className="accent-primary"
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            )}
          </div>
          <label className="flex items-center gap-2 rounded-xl bg-gold/10 p-3 text-sm">
            <input
              type="checkbox"
              checked={canFileExams}
              onChange={(e) => setCanFileExams(e.target.checked)}
              className="accent-primary"
            />
            السماح بإنشاء اختبارات ورقية/مرفوعة (صور/PDF)
          </label>
          {!isIndependent && (
            <label className="flex items-center gap-2 rounded-xl bg-gold/10 p-3 text-sm">
              <input
                type="checkbox"
                checked={canManageStudents}
                onChange={(e) => setCanManageStudents(e.target.checked)}
                className="accent-primary"
              />
              السماح بإضافة وإدارة حسابات الطلاب (الإسناد متاح دائماً)
            </label>
          )}

          {/* تعديل حدّ طلاب مدرّس مستقلّ قائم (للمدير العام). */}
          {canManageAdmins && mode === "edit" && initial?.isIndependent && (
            <div className="rounded-xl border border-primary/30 bg-primary-light/40 p-3 text-sm">
              <p className="mb-2 font-medium text-primary-dark">
                مدرّس مستقلّ يدير مؤسّسته
              </p>
              <label className="block">
                <span className="mb-1 block font-medium text-ink">
                  حدّ عدد الطلاب (حسب الاشتراك)
                </span>
                <input
                  type="number"
                  min={1}
                  dir="ltr"
                  className="field w-32"
                  value={studentLimit}
                  onChange={(e) => setStudentLimit(e.target.value)}
                />
              </label>
            </div>
          )}

          {/* مدرّس مستقلّ — للمدير العام عند الإنشاء فقط. في الوضع المبسّط: دائماً مستقلّ. */}
          {canManageAdmins && mode === "create" && (
            <div className="rounded-xl border border-primary/30 bg-primary-light/40 p-3">
              {SOLO_MODE ? (
                <p className="text-sm font-medium text-primary-dark">
                  مدرّس مستقلّ يدير طلابه ضمن حدّ الاشتراك
                </p>
              ) : (
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={isIndependent}
                    onChange={(e) => setIsIndependent(e.target.checked)}
                    className="accent-primary"
                  />
                  مدرّس مستقلّ يدير مؤسّسته بنفسه (هو المدير والمدرّس)
                </label>
              )}
              {isIndependent && (
                <div className="mt-3 space-y-2 text-sm text-ink/70">
                  <p>
                    تُنشأ له مؤسّسة خاصّة تلقائياً, ويُمنح إدارة الطلاب، ويسجّل
                    طلابه ويتحكّم بهم (إضافةً وحذفاً وإسناداً) ضمن الحدّ أدناه.
                  </p>
                  <label className="block">
                    <span className="mb-1 block font-medium text-ink">
                      حدّ عدد الطلاب (حسب الاشتراك)
                    </span>
                    <input
                      type="number"
                      min={1}
                      dir="ltr"
                      className="field w-32"
                      value={studentLimit}
                      onChange={(e) => setStudentLimit(e.target.value)}
                    />
                  </label>
                </div>
              )}
            </div>
          )}
        </>
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

      {mode === "create" && customFields.length > 0 && (
        <CustomFieldsInput
          defs={customFields}
          value={customData}
          onChange={setCustomData}
        />
      )}

      {(mode === "create" || initial?.canEditNotes) && (
        <CreatorNotesField value={creatorNotes} onChange={setCreatorNotes} />
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
          {busy ? "…" : mode === "create" ? "إنشاء الحساب" : "حفظ التعديلات"}
        </button>
        <button
          onClick={() => router.push("/admin/users")}
          className="rounded-xl border border-line px-5 py-3 font-medium hover:bg-ink/5"
        >
          رجوع
        </button>
      </div>
    </div>
  );
}
