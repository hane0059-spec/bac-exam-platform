"use client";
// src/components/admin/CreatorNotesEditor.tsx
// محرّر ملاحظات مُنشئ مضمّن (مؤسّسة/وليّ أمر/…) — يظهر لمُنشئ العنصر وحده،
// ويُحرَّر دائماً عبر PATCH على endpoint يستقبل { notes }.
import { useState } from "react";
import { useRouter } from "next/navigation";
import CreatorNotesField from "@/components/CreatorNotesField";

export default function CreatorNotesEditor({
  endpoint,
  initialNotes,
  about,
}: {
  endpoint: string;
  initialNotes: string;
  about?: string;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const dirty = notes !== initialNotes;

  async function save() {
    setError("");
    setSaved(false);
    setBusy(true);
    const res = await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(d.error ?? "تعذّر الحفظ.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <CreatorNotesField
        value={notes}
        onChange={(v) => {
          setNotes(v);
          setSaved(false);
        }}
        about={about}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && !error && (
        <p className="text-sm text-primary-dark">تم حفظ الملاحظات.</p>
      )}
      <button
        onClick={save}
        disabled={busy || !dirty}
        className="rounded-xl border border-line px-4 py-2 text-sm font-medium hover:bg-ink/5 disabled:opacity-50"
      >
        {busy ? "…" : "حفظ الملاحظات"}
      </button>
    </div>
  );
}
