"use client";
// src/components/admin/ResourcesManager.tsx
// المدير العام: رفع/حذف ملفّات PDF عامّة لصفحة «أسئلة وإثراء» لكل صفّ.
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { kindOfMime, RESOURCE_ACCEPT, MAX_POST_BODY } from "@/lib/resources";

interface FileRow {
  id: string;
  title: string;
  sizeBytes: number;
  downloadCount: number;
  kind: string;
  body: string | null;
  mimeType: string;
}
interface GradeRow {
  id: string;
  name: string;
  files: FileRow[];
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} ب`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} ك.ب`;
  return `${(n / (1024 * 1024)).toFixed(1)} م.ب`;
}

export default function ResourcesManager({
  gradeLevels,
}: {
  gradeLevels: GradeRow[];
}) {
  const router = useRouter();
  const [gradeId, setGradeId] = useState(gradeLevels[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [postTitle, setPostTitle] = useState("");
  const [postBody, setPostBody] = useState("");
  const [posting, setPosting] = useState(false);

  async function publishPost() {
    setError("");
    setPosting(true);
    const res = await fetch("/api/admin/resources/post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gradeLevelId: gradeId, title: postTitle, body: postBody }),
    });
    setPosting(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "تعذّر النشر.");
      return;
    }
    setPostTitle("");
    setPostBody("");
    router.refresh();
  }

  async function upload(file: File) {
    setError("");
    setBusy(true);
    const fd = new FormData();
    fd.append("gradeLevelId", gradeId);
    fd.append("file", file);
    const res = await fetch("/api/admin/resources", { method: "POST", body: fd });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "تعذّر الرفع.");
      return;
    }
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("حذف هذا الملف نهائياً؟")) return;
    setDeletingId(id);
    const res = await fetch(`/api/admin/resources/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (!res.ok) {
      setError("تعذّر الحذف.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="card space-y-3 p-5">
        <h3 className="font-display font-semibold">إضافة محتوى جديد</h3>
        <div>
          <label className="mb-1.5 block text-sm font-medium">الصفّ</label>
          <select
            className="field"
            value={gradeId}
            onChange={(e) => setGradeId(e.target.value)}
          >
            {gradeLevels.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">ملفّ أو صورة (PDF/Word حتى 15 م.ب، صورة JPG/PNG/WebP حتى 5 م.ب)</label>
          <input
            ref={inputRef}
            type="file"
            accept={RESOURCE_ACCEPT}
            disabled={busy || !gradeId}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
            }}
            className="block text-sm"
          />
          <p className="mt-1 text-xs text-ink/50">
            يظهر اسم الملف للطلاب كما هو مرفوع — تأكّد من وضوحه قبل الرفع.
          </p>
        </div>
        <div className="border-t border-line pt-3">
          <p className="mb-1.5 text-sm font-medium">أو انشر نصّاً/إعلاناً</p>
          <input
            className="field mb-2"
            placeholder="العنوان"
            maxLength={200}
            value={postTitle}
            onChange={(e) => setPostTitle(e.target.value)}
          />
          <textarea
            className="field min-h-[110px]"
            placeholder="نصّ المنشور (يظهر للقارئ كما تكتبه)"
            maxLength={MAX_POST_BODY}
            value={postBody}
            onChange={(e) => setPostBody(e.target.value)}
          />
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={publishPost}
              disabled={posting || !gradeId || !postTitle.trim() || !postBody.trim()}
              className="btn-primary disabled:opacity-50"
            >
              {posting ? "جارٍ النشر…" : "نشر"}
            </button>
            <span className="text-xs text-ink/45">
              {postBody.length}/{MAX_POST_BODY}
            </span>
          </div>
        </div>
        {busy && <p className="text-sm text-ink/50">جارٍ الرفع…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {gradeLevels.map((g) => (
        <div key={g.id} className="card p-5">
          <h3 className="mb-3 font-display font-semibold">
            {g.name}
            <span className="mr-2 text-sm font-normal text-ink/50">
              ({g.files.length} ملفّ)
            </span>
          </h3>
          {g.files.length === 0 ? (
            <p className="text-sm text-ink/50">لا ملفّات لهذا الصفّ بعد.</p>
          ) : (
            <ul className="space-y-2">
              {g.files.map((f) => (
                <li
                  key={f.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2.5"
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="flex min-w-0 items-center gap-2">
                      <span aria-hidden>
                        {{ text: "📌", image: "🖼️", word: "📝", pdf: "📄" }[kindOfMime(f.mimeType, f.kind)]}
                      </span>
                      <span className="truncate text-sm font-medium">{f.title}</span>
                      {f.kind !== "TEXT" && (
                        <>
                          <span className="shrink-0 text-xs text-ink/45">
                            {formatBytes(f.sizeBytes)}
                          </span>
                          <span className="shrink-0 rounded-full bg-primary-light px-2 py-0.5 text-xs font-medium text-primary-dark">
                            ⬇ {f.downloadCount}
                          </span>
                        </>
                      )}
                    </span>
                    {f.kind === "TEXT" && f.body && (
                      <span className="truncate text-xs text-ink/50">{f.body}</span>
                    )}
                  </span>
                  <button
                    onClick={() => remove(f.id)}
                    disabled={deletingId === f.id}
                    className="shrink-0 text-sm text-red-600 hover:underline disabled:opacity-50"
                  >
                    {deletingId === f.id ? "جارٍ الحذف…" : "حذف"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
