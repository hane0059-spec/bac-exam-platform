"use client";
// src/components/admin/FieldsManager.tsx
// المدير العام: إنشاء/حذف الحقول المخصّصة للمستخدمين.
import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmButton from "@/components/ConfirmButton";

interface FieldRow {
  id: string;
  label: string;
  fieldType: string;
  required: boolean;
  appliesTo: string;
  options: string[];
}

const AUDIENCE: Record<string, string> = {
  ALL: "الكل",
  STUDENT: "الطلاب",
  TEACHER: "المدرّسون",
  ADMIN: "المدراء",
};
const TYPES: Record<string, string> = {
  TEXT: "نصّ",
  NUMBER: "رقم",
  SELECT: "قائمة",
};

export default function FieldsManager({ fields }: { fields: FieldRow[] }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [fieldType, setFieldType] = useState<"TEXT" | "NUMBER" | "SELECT">("TEXT");
  const [required, setRequired] = useState(false);
  const [appliesTo, setAppliesTo] = useState("ALL");
  const [options, setOptions] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function call(body: Record<string, unknown>) {
    setError("");
    setBusy(true);
    const res = await fetch("/api/admin/fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "تعذّر التنفيذ.");
      return false;
    }
    router.refresh();
    return true;
  }

  async function add() {
    const ok = await call({
      action: "create",
      label,
      fieldType,
      required,
      appliesTo,
      options: fieldType === "SELECT"
        ? options.split(/[،,\n]/).map((o) => o.trim()).filter(Boolean)
        : [],
    });
    if (ok) {
      setLabel("");
      setOptions("");
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card p-5">
        <h3 className="mb-3 font-display font-semibold">
          الحقول الحالية ({fields.length})
        </h3>
        {fields.length === 0 ? (
          <p className="text-sm text-ink/50">لا حقول مخصّصة بعد.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {fields.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between rounded-lg bg-ink/5 px-3 py-1.5"
              >
                <span>
                  {f.label}
                  <span className="mr-2 text-xs text-ink/40">
                    {TYPES[f.fieldType]} · {AUDIENCE[f.appliesTo]}
                    {f.required ? " · إجباري" : ""}
                  </span>
                </span>
                <ConfirmButton
                  onConfirm={async () => {
                    await call({ action: "delete", id: f.id });
                  }}
                  label="حذف"
                  confirmLabel="حذف الحقل"
                  message={`حذف الحقل «${f.label}»؟`}
                  className="text-red-500 hover:underline"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card space-y-3 p-5">
        <h3 className="font-display font-semibold">إضافة حقل</h3>
        <input
          className="field"
          placeholder="اسم الحقل (مثل: المدينة)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            className="field"
            value={fieldType}
            onChange={(e) => setFieldType(e.target.value as "TEXT")}
          >
            <option value="TEXT">نصّ</option>
            <option value="NUMBER">رقم</option>
            <option value="SELECT">قائمة اختيار</option>
          </select>
          <select
            className="field"
            value={appliesTo}
            onChange={(e) => setAppliesTo(e.target.value)}
          >
            <option value="ALL">الكل</option>
            <option value="STUDENT">الطلاب</option>
            <option value="TEACHER">المدرّسون</option>
            <option value="ADMIN">المدراء</option>
          </select>
        </div>
        {fieldType === "SELECT" && (
          <textarea
            className="field"
            placeholder="خيارات القائمة (افصل بفاصلة أو سطر)"
            value={options}
            onChange={(e) => setOptions(e.target.value)}
          />
        )}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
            className="accent-primary"
          />
          إجباري
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          onClick={add}
          disabled={busy || !label.trim()}
          className="btn-primary"
        >
          إضافة الحقل
        </button>
      </div>
    </div>
  );
}
