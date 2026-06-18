"use client";
// src/components/admin/ParentLinks.tsx
// المدير: إدارة روابط ولي الأمر بأبنائه (إضافة بالرموز / فكّ ربط).
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Child {
  id: string;
  name: string;
  studentCode: string | null;
  gradeName: string | null;
}

function splitCodes(text: string): string[] {
  return text
    .split(/[\s,،\n]+/)
    .map((c) => c.trim())
    .filter(Boolean);
}

export default function ParentLinks({
  parentId,
  children,
}: {
  parentId: string;
  children: Child[];
}) {
  const router = useRouter();
  const [codes, setCodes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function add() {
    setError("");
    setBusy(true);
    const res = await fetch(`/api/admin/parents/${parentId}/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentCodes: splitCodes(codes) }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "تعذّر الربط.");
      return;
    }
    setCodes("");
    router.refresh();
  }

  async function remove(studentId: string, name: string) {
    if (!confirm(`فكّ ربط «${name}»؟`)) return;
    setError("");
    setBusy(true);
    const res = await fetch(`/api/admin/parents/${parentId}/links`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "تعذّر فكّ الربط.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {children.length === 0 ? (
          <div className="card p-6 text-center text-ink/60">
            لا أبناء مرتبطون بعد.
          </div>
        ) : (
          children.map((c) => (
            <div
              key={c.id}
              className="card flex items-center justify-between gap-2 p-3"
            >
              <div>
                <span className="font-medium">{c.name}</span>
                <p className="mt-0.5 flex gap-2 text-xs text-ink/40" dir="ltr">
                  {c.studentCode && <span>{c.studentCode}</span>}
                  {c.gradeName && <span className="text-ink/50">{c.gradeName}</span>}
                </p>
              </div>
              <button
                onClick={() => remove(c.id, c.name)}
                disabled={busy}
                className="text-sm text-red-500 hover:underline"
              >
                فكّ الربط
              </button>
            </div>
          ))
        )}
      </div>

      <div className="card space-y-2 p-4">
        <label className="block text-sm font-medium">ربط أبناء بالرموز</label>
        <textarea
          className="field min-h-[72px]"
          dir="ltr"
          placeholder="S-1001, S-1002 ..."
          value={codes}
          onChange={(e) => setCodes(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          onClick={add}
          disabled={busy || splitCodes(codes).length === 0}
          className="btn-primary px-4 py-1.5 text-sm"
        >
          ربط
        </button>
      </div>
    </div>
  );
}
