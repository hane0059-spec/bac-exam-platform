"use client";
// src/components/admin/ParentForm.tsx
// المدير: نموذج إنشاء ولي أمر وربطه بطلاب بلصق رموزهم.
import { useState } from "react";
import { useRouter } from "next/navigation";
import CreatorNotesField from "@/components/CreatorNotesField";

function splitCodes(text: string): string[] {
  return text
    .split(/[\s,،\n]+/)
    .map((c) => c.trim())
    .filter(Boolean);
}

export default function ParentForm({
  schools,
}: {
  schools?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE">("MALE");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [codes, setCodes] = useState("");
  const [schoolId, setSchoolId] = useState(schools?.[0]?.id ?? "");
  const [creatorNotes, setCreatorNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    setBusy(true);
    const res = await fetch("/api/admin/parents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        gender,
        email: email || undefined,
        password,
        studentCodes: splitCodes(codes),
        creatorNotes,
        ...(schools ? { schoolId: schoolId || null } : {}),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "تعذّر الإنشاء.");
      return;
    }
    router.push("/admin/parents");
    router.refresh();
  }

  return (
    <div className="card max-w-xl space-y-3 p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          className="field"
          placeholder="الاسم الأول"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
        <input
          className="field"
          placeholder="الاسم الأخير"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <select
          className="field"
          value={gender}
          onChange={(e) => setGender(e.target.value as "MALE" | "FEMALE")}
        >
          <option value="MALE">ولي أمر</option>
          <option value="FEMALE">وليّة أمر</option>
        </select>
        {schools && (
          <select
            className="field"
            value={schoolId}
            onChange={(e) => setSchoolId(e.target.value)}
          >
            <option value="">بلا مؤسّسة</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <input
        className="field"
        dir="ltr"
        placeholder="البريد الإلكتروني (اختياري)"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="field"
        type="password"
        placeholder="كلمة السر (6 أحرف على الأقل)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <div>
        <label className="mb-1 block text-sm text-ink/60">
          رموز الطلاب الأبناء (افصل بفاصلة أو سطر)
        </label>
        <textarea
          className="field min-h-[88px]"
          dir="ltr"
          placeholder="S-1001, S-1002 ..."
          value={codes}
          onChange={(e) => setCodes(e.target.value)}
        />
      </div>

      <CreatorNotesField
        value={creatorNotes}
        onChange={setCreatorNotes}
        about="وليّ الأمر"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={submit}
        disabled={
          busy || !firstName.trim() || !lastName.trim() || password.length < 6
        }
        className="btn-primary"
      >
        إنشاء ولي الأمر
      </button>
    </div>
  );
}
