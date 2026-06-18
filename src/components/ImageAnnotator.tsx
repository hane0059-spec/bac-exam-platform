"use client";
// src/components/ImageAnnotator.tsx
// عرض صورة إجابة مع تعليقات المدرّس كدبابيس بمواضع نسبية.
// editable=true: المدرّس ينقر لإضافة دبّوس ويحذف. غير ذلك: قراءة فقط للطالب/الوليّ.
import { useState } from "react";
import { useRouter } from "next/navigation";

export interface Pin {
  id: string;
  x: number;
  y: number;
  text: string;
}

export default function ImageAnnotator({
  attachmentId,
  mimeType,
  annotations,
  editable = false,
}: {
  attachmentId: string;
  mimeType: string;
  annotations: Pin[];
  editable?: boolean;
}) {
  const router = useRouter();
  const src = `/api/attachments/${attachmentId}`;
  const [open, setOpen] = useState<string | null>(null); // دبّوس مفتوح لعرض نصّه
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null);
  const [draftText, setDraftText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (mimeType === "application/pdf") {
    return (
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-sm text-primary hover:underline"
      >
        عرض ملف PDF ↗ {!editable && annotations.length > 0 && "(لا تعليقات على PDF)"}
      </a>
    );
  }

  function onImageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!editable || busy) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setDraft({ x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) });
    setDraftText("");
    setOpen(null);
    setError("");
  }

  async function saveDraft() {
    if (!draft || !draftText.trim()) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/teacher/annotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attachmentId,
        x: draft.x,
        y: draft.y,
        text: draftText.trim(),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "تعذّر الحفظ.");
      return;
    }
    setDraft(null);
    setDraftText("");
    router.refresh();
  }

  async function remove(id: string) {
    setBusy(true);
    const res = await fetch(`/api/teacher/annotations/${id}`, {
      method: "DELETE",
    });
    setBusy(false);
    if (res.ok) {
      setOpen(null);
      router.refresh();
    }
  }

  return (
    <div className="space-y-2">
      <div
        className={`relative inline-block max-w-full ${
          editable ? "cursor-crosshair" : ""
        }`}
        onClick={onImageClick}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="صورة الإجابة"
          className="max-h-[70vh] w-auto max-w-full rounded-lg border border-line"
        />

        {/* الدبابيس */}
        {annotations.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(open === p.id ? null : p.id);
              setDraft(null);
            }}
            style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
            className="absolute z-10 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow"
            title={p.text}
          >
            {i + 1}
          </button>
        ))}

        {/* فقاعة نصّ الدبّوس المفتوح */}
        {open &&
          (() => {
            const p = annotations.find((a) => a.id === open);
            if (!p) return null;
            return (
              <div
                style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
                onClick={(e) => e.stopPropagation()}
                className="absolute z-20 w-48 -translate-x-1/2 translate-y-2 rounded-xl border border-line bg-white p-2 text-sm shadow-card"
              >
                <p className="leading-relaxed">{p.text}</p>
                {editable && (
                  <button
                    onClick={() => remove(p.id)}
                    disabled={busy}
                    className="mt-1 text-xs text-red-500 hover:underline"
                  >
                    حذف
                  </button>
                )}
              </div>
            );
          })()}

        {/* مسوّدة دبّوس جديد */}
        {draft && (
          <div
            style={{ left: `${draft.x * 100}%`, top: `${draft.y * 100}%` }}
            onClick={(e) => e.stopPropagation()}
            className="absolute z-20 w-56 -translate-x-1/2 translate-y-2 space-y-2 rounded-xl border border-primary bg-white p-2 shadow-card"
          >
            <textarea
              autoFocus
              className="field min-h-[56px] text-sm"
              placeholder="اكتب تعليقك هنا…"
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={saveDraft}
                disabled={busy || !draftText.trim()}
                className="btn-primary px-3 py-1 text-xs"
              >
                حفظ
              </button>
              <button
                onClick={() => setDraft(null)}
                className="text-xs text-ink/60 hover:underline"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}
      </div>

      {editable && (
        <p className="text-xs text-ink/40">
          انقر على الصورة لإضافة تعليق في موضعه.
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
