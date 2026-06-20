"use client";
// src/components/teacher/FileExamManager.tsx
// المدرّس: إدارة اختبار ورقي — تعديل البيانات، رفع الملف، النشر.
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ImageUploadField from "@/components/ImageUploadField";
import ConfirmButton from "@/components/ConfirmButton";
import DateTimeField from "@/components/DateTimeField";

function toLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(
    d.getHours(),
  )}:${p(d.getMinutes())}`;
}

interface Props {
  quizId: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  purged?: boolean;
  accessCode: string | null;
  examFile: { id: string; mimeType: string } | null;
  initial: {
    title: string;
    description: string;
    maxScore: number;
    minutes: string;
    availableFrom: string | null;
    availableUntil: string | null;
  };
}

export default function FileExamManager({
  quizId,
  status,
  purged = false,
  accessCode,
  examFile,
  initial,
}: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [maxScore, setMaxScore] = useState(initial.maxScore);
  const [minutes, setMinutes] = useState(initial.minutes);
  const [from, setFrom] = useState(toLocal(initial.availableFrom));
  const [until, setUntil] = useState(toLocal(initial.availableUntil));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  function flash(m: string) {
    setMsg(m);
    setError("");
  }

  async function saveDetails() {
    setBusy(true);
    setError("");
    setMsg("");
    const res = await fetch(`/api/teacher/file-exams/${quizId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: description || undefined,
        maxScore: Number(maxScore),
        timeLimitSec: minutes ? Number(minutes) * 60 : null,
        availableFrom: from ? new Date(from).toISOString() : null,
        availableUntil: until ? new Date(until).toISOString() : null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "تعذّر الحفظ.");
      return;
    }
    flash("تم الحفظ.");
    router.refresh();
  }

  // يرمي عند الفشل ليُظهر ImageUploadField الخطأ ويُبقي المعاينة.
  async function uploadFile(file: File) {
    setError("");
    setMsg("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/teacher/file-exams/${quizId}/exam-file`, {
      method: "POST",
      body: fd,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "تعذّر الرفع.");
    }
    flash("تم رفع الملف.");
    router.refresh();
  }

  async function togglePublish() {
    setBusy(true);
    setError("");
    setMsg("");
    const action = status === "PUBLISHED" ? "unpublish" : "publish";
    const res = await fetch(`/api/teacher/quizzes/${quizId}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "تعذّر تغيير الحالة.");
      return;
    }
    router.refresh();
  }

  async function archive() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/teacher/quizzes/${quizId}`, {
      method: "DELETE",
    });
    setBusy(false);
    if (res.ok) {
      router.push("/teacher/quizzes");
      router.refresh();
    } else setError("تعذّر الحذف.");
  }

  async function restore() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/teacher/quizzes/${quizId}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restore" }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else setError("تعذّر الاستعادة.");
  }

  async function permanentDelete() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/teacher/quizzes/${quizId}?permanent=1`, {
      method: "DELETE",
    });
    setBusy(false);
    if (res.ok) {
      router.push("/teacher/quizzes");
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "تعذّر الحذف النهائي.");
    }
  }

  return (
    <div className="space-y-5">
      {purged && (
        <div className="rounded-xl bg-gold/15 p-3 text-sm text-gold">
          حُذف محتوى هذا الاختبار (الملف والأوراق المرفوعة) نهائياً — تبقى درجات
          الطلاب محفوظةً للسجلّ فقط. اطّلع عليها من «الإجابات والتصحيح».
        </div>
      )}
      {/* الحالة والنشر */}
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <span className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              status === "PUBLISHED"
                ? "bg-primary text-white"
                : status === "ARCHIVED"
                ? "bg-gold/15 text-gold"
                : "bg-ink/10 text-ink/60"
            }`}
          >
            {status === "PUBLISHED"
              ? "منشور"
              : status === "ARCHIVED"
              ? "مؤرشف"
              : "مسوّدة"}
          </span>
          {accessCode && (
            <span className="text-sm text-ink/60">
              رمز الاختبار:{" "}
              <span className="font-bold" dir="ltr">
                {accessCode}
              </span>
            </span>
          )}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {status === "PUBLISHED" && (
            <Link
              href={`/teacher/quizzes/${quizId}/assign`}
              className="rounded-xl border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary-light"
            >
              إسناد للطلاب
            </Link>
          )}
          <Link
            href={`/teacher/file-exams/${quizId}/submissions`}
            className="rounded-xl border border-line px-4 py-2 text-sm font-medium hover:bg-ink/5"
          >
            الإجابات والتصحيح
          </Link>
          {status === "ARCHIVED" ? (
            purged ? null : (
              <>
                <button
                  onClick={restore}
                  disabled={busy}
                  className="btn-primary px-4 py-2 text-sm"
                >
                  إعادة إلى المسوّدة
                </button>
                <ConfirmButton
                  onConfirm={permanentDelete}
                  label="حذف نهائي"
                  confirmLabel="نعم، احذف المحتوى"
                  message="حذف ملف الاختبار وأوراق الطلاب المرفوعة وتفاصيلها نهائياً؟ تبقى درجات الطلاب (من أدّى وكم أخذ) محفوظةً للسجلّ. إن لم يؤدِّه أحد فسيُحذف بالكامل."
                  disabled={busy}
                  className="text-sm text-red-500 hover:underline"
                />
              </>
            )
          ) : (
            <>
              <button
                onClick={togglePublish}
                disabled={busy}
                className="btn-primary px-4 py-2 text-sm"
              >
                {status === "PUBLISHED" ? "إلغاء النشر" : "نشر"}
              </button>
              <ConfirmButton
                onConfirm={archive}
                label="حذف"
                confirmLabel="نعم، احذف الاختبار"
                message="حذف هذا الاختبار؟ يُنقَل إلى الأرشيف (يمكن استعادته أو حذفه نهائياً لاحقاً)."
                disabled={busy}
                className="text-sm text-red-500 hover:underline"
              />
            </>
          )}
        </div>
      </div>

      {/* ملف الاختبار */}
      <div className="card space-y-3 p-5">
        <h3 className="font-display font-semibold">ملف الاختبار (صورة/PDF)</h3>
        {examFile ? (
          <a
            href={`/api/attachments/${examFile.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm text-primary hover:underline"
          >
            عرض الملف الحالي ↗
          </a>
        ) : (
          <p className="text-sm text-ink/50">لا ملف بعد — ارفع ملف الاختبار.</p>
        )}
        <ImageUploadField
          onUpload={uploadFile}
          label="رفع/استبدال ملف الاختبار"
          hint="JPG/PNG/PDF حتى 3 م.ب — تُضغط الصور تلقائياً مع الحفاظ على الوضوح."
          maxDim={2200}
          quality={0.82}
          disabled={busy}
        />
      </div>

      {/* البيانات */}
      <div className="card space-y-3 p-5">
        <h3 className="font-display font-semibold">بيانات الاختبار</h3>
        <input
          className="field"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="العنوان"
        />
        <textarea
          className="field min-h-[64px]"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="وصف/تعليمات (اختياري)"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-ink/60">الدرجة القصوى</label>
            <input
              type="number"
              min={1}
              className="field"
              value={maxScore}
              onChange={(e) => setMaxScore(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-ink/60">
              المدة بالدقائق (اختياري)
            </label>
            <input
              type="number"
              min={1}
              dir="ltr"
              className="field"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-ink/60">يتاح من</label>
            <DateTimeField value={from} onChange={setFrom} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-ink/60">يتاح حتى</label>
            <DateTimeField value={until} onChange={setUntil} />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {msg && <p className="text-sm text-primary-dark">{msg}</p>}

        <button
          onClick={saveDetails}
          disabled={busy || !title.trim() || maxScore < 1}
          className="btn-primary"
        >
          حفظ البيانات
        </button>
      </div>
    </div>
  );
}
