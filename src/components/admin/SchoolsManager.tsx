"use client";
// src/components/admin/SchoolsManager.tsx
// المدير العام: إنشاء مدرسة/معهد.
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SchoolsManager() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<"مدرسة" | "معهد">("مدرسة");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function add() {
    setError("");
    setBusy(true);
    const res = await fetch("/api/admin/schools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(d.error ?? "تعذّر الإضافة.");
      return;
    }
    setName("");
    router.refresh();
  }

  return (
    <div className="card max-w-lg space-y-3 p-5">
      <h3 className="font-display font-semibold">إضافة مؤسّسة</h3>
      <input
        className="field"
        placeholder="اسم المدرسة/المعهد"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <select
        className="field"
        value={type}
        onChange={(e) => setType(e.target.value as "مدرسة" | "معهد")}
      >
        <option value="مدرسة">مدرسة</option>
        <option value="معهد">معهد</option>
      </select>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        onClick={add}
        disabled={busy || !name.trim()}
        className="btn-primary"
      >
        إضافة
      </button>
    </div>
  );
}
