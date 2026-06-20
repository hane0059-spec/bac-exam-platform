"use client";
// src/components/student/FileExamRunner.tsx
// أداء اختبار ورقي: عرض ملف الاختبار، رفع صور الإجابة، الإرسال، وعرض النتيجة.
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import ImageUploadField from "@/components/ImageUploadField";
import ImageAnnotator, { type Pin } from "@/components/ImageAnnotator";
import AppealBox, { type AppealState } from "@/components/student/AppealBox";

function fmtClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// عدّاد تنازلي للمهلة — عند الصفر يُحدّث الصفحة ليُنهي الخادم الجلسة.
function Countdown({ initial }: { initial: number }) {
  const router = useRouter();
  const [left, setLeft] = useState(initial);
  const fired = useRef(false);
  useEffect(() => {
    if (left <= 0) {
      if (!fired.current) {
        fired.current = true;
        router.refresh();
      }
      return;
    }
    const t = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [left, router]);
  const low = left <= 60;
  return (
    <span
      className={`rounded-full px-3 py-1 text-sm font-bold tabular-nums ${
        low ? "bg-red-100 text-red-700" : "bg-gold/15 text-gold"
      }`}
      dir="ltr"
    >
      ⏱ {fmtClock(Math.max(0, left))}
    </span>
  );
}

interface Upload {
  id: string;
  mimeType: string;
  annotations?: Pin[];
}
interface Finished {
  needsGrading: boolean;
  score: number;
  max: number;
  percentage: number;
  feedback: string | null;
  uploads: Upload[];
  sessionId: string;
  appeal: AppealState | null;
}

function FilePreview({ att }: { att: Upload }) {
  const href = `/api/attachments/${att.id}`;
  if (att.mimeType === "application/pdf") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-24 w-24 items-center justify-center rounded-lg border border-line text-xs text-primary"
      >
        PDF ↗
      </a>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={href}
        alt="صفحة إجابة"
        className="h-24 w-24 rounded-lg border border-line object-cover"
      />
    </a>
  );
}

export default function FileExamRunner({
  quizId,
  title,
  description,
  examFileId,
  view,
  canStart,
  timeLimitSec,
  timeRemainingSec,
  sessionId,
  inProgressUploads,
  finished,
}: {
  quizId: string;
  title: string;
  description: string | null;
  examFileId: string | null;
  view: "locked" | "not_started" | "in_progress" | "submitted" | "graded";
  canStart: boolean;
  timeLimitSec: number | null;
  timeRemainingSec: number | null;
  sessionId: string | null;
  inProgressUploads: Upload[];
  finished: Finished | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false); // تأكيد الإرسال النهائي

  async function start() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/student/file-exams/${quizId}/start`, {
      method: "POST",
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "تعذّر البدء.");
    router.refresh();
  }

  // يرمي عند الفشل ليُظهر ImageUploadField رسالة الخطأ ويُبقي المعاينة.
  async function addPage(file: File) {
    if (!sessionId) throw new Error("لا جلسة.");
    setConfirming(false); // أيّ تغيير في الصور يلغي تأكيد الإرسال
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(
      `/api/student/file-exams/sessions/${sessionId}/upload`,
      { method: "POST", body: fd },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "تعذّر الرفع.");
    }
    router.refresh();
  }

  async function removePage(attachmentId: string) {
    if (!sessionId) return;
    setConfirming(false); // أيّ تغيير في الصور يلغي تأكيد الإرسال
    setBusy(true);
    setError("");
    const res = await fetch(
      `/api/student/file-exams/sessions/${sessionId}/upload`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attachmentId }),
      },
    );
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return setError(data.error ?? "تعذّر الحذف.");
    }
    router.refresh();
  }

  // الإرسال الفعلي — يُستدعى من زرّ التأكيد داخل الواجهة فقط.
  async function doSubmit() {
    if (!sessionId) return;
    setBusy(true);
    setError("");
    const res = await fetch(
      `/api/student/file-exams/sessions/${sessionId}/submit`,
      { method: "POST" },
    );
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "تعذّر الإرسال.");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-bold">{title}</h2>
        {description && (
          <p className="mt-1 text-sm leading-relaxed text-ink/60">{description}</p>
        )}
        <span className="mt-2 inline-block rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-medium text-gold">
          اختبار ورقي
        </span>
      </div>

      {/* ملف الاختبار */}
      <div className="card p-5">
        <h3 className="mb-2 font-display font-semibold">ورقة الاختبار</h3>
        {examFileId ? (
          <a
            href={`/api/attachments/${examFileId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            عرض/تنزيل ورقة الاختبار ↗
          </a>
        ) : (
          <p className="text-sm text-ink/50">لم يُرفَع ملف الاختبار بعد.</p>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {view === "locked" && (
        <div className="card p-8 text-center text-ink/60">
          هذا الاختبار غير متاح الآن (انتهت محاولاتك أو خارج وقت الإتاحة).
        </div>
      )}

      {view === "not_started" && (
        <div className="card space-y-3 p-6 text-center">
          <p className="text-ink/70">
            اطّلع على ورقة الاختبار أعلاه، ثم ابدأ لرفع صور إجابتك.
          </p>
          {timeLimitSec && (
            <p className="text-sm text-gold">
              ⏱ المدة المتاحة: {Math.round(timeLimitSec / 60)} دقيقة من لحظة البدء.
            </p>
          )}
          <button onClick={start} disabled={busy || !canStart} className="btn-primary">
            ابدأ الاختبار
          </button>
        </div>
      )}

      {view === "in_progress" && (
        <>
          {/* قسم رفع صور الإجابة (إضافة/حذف بحرّية قبل الإرسال) */}
          <div className="card space-y-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display font-semibold">صور إجابتك</h3>
              {timeRemainingSec !== null && (
                <Countdown initial={timeRemainingSec} />
              )}
            </div>
            {inProgressUploads.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {inProgressUploads.map((u) => (
                  <div key={u.id} className="space-y-1 text-center">
                    <FilePreview att={u} />
                    <button
                      onClick={() => removePage(u.id)}
                      disabled={busy}
                      className="block text-xs text-red-500 hover:underline"
                    >
                      حذف
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink/50">لم ترفع صوراً بعد.</p>
            )}

            <ImageUploadField
              onUpload={addPage}
              label="أضف صورة صفحة (يمكن إضافة عدّة صفحات)"
              hint="صوّر ورقتك بوضوح وإضاءة جيّدة — تُضغط تلقائياً قبل الرفع."
              capture
              disabled={busy}
            />
          </div>

          {/* قسم الإرسال النهائي — منفصلٌ تماماً وبتأكيد داخل الواجهة */}
          <div className="card space-y-3 border-t-4 border-t-gold p-6">
            <h3 className="font-display font-semibold">الإرسال النهائي للتصحيح</h3>
            <p className="text-sm leading-relaxed text-ink/60">
              بعد الإرسال <span className="font-medium text-ink">لا يمكنك</span>{" "}
              إضافة أو حذف أو تعديل أي صورة. تأكّد من رفع كل صفحات إجابتك أولاً.
            </p>

            {inProgressUploads.length === 0 ? (
              <p className="text-sm text-ink/50">
                ارفع صورة واحدة على الأقل لتتمكّن من الإرسال.
              </p>
            ) : !confirming ? (
              <button
                onClick={() => setConfirming(true)}
                disabled={busy}
                className="btn-primary"
              >
                إرسال الإجابة للتصحيح
              </button>
            ) : (
              <div className="space-y-3 rounded-xl border border-gold bg-gold/10 p-4">
                <p className="text-sm font-medium text-gold">
                  تأكيد الإرسال: ستُرسَل {inProgressUploads.length} صفحة للتصحيح
                  ولن تتمكّن من التعديل بعدها. هل أنت متأكّد؟
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={doSubmit}
                    disabled={busy}
                    className="btn-primary"
                  >
                    {busy ? "جارٍ الإرسال…" : "نعم، أرسل الآن"}
                  </button>
                  <button
                    onClick={() => setConfirming(false)}
                    disabled={busy}
                    className="rounded-xl border border-line px-5 py-3 text-sm font-medium hover:bg-ink/5"
                  >
                    تراجع
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {view === "submitted" && finished && (
        <div className="card space-y-3 p-6">
          <p className="rounded-xl bg-gold/10 p-3 text-center text-sm font-medium text-gold">
            تم إرسال إجابتك — بانتظار تصحيح المدرّس.
          </p>
          <div className="flex flex-wrap gap-3">
            {finished.uploads.map((u) => (
              <FilePreview key={u.id} att={u} />
            ))}
          </div>
        </div>
      )}

      {view === "graded" && finished && (
        <div className="card space-y-4 p-6">
          <div className="text-center">
            <p
              className={`font-display text-5xl font-bold ${
                finished.percentage >= 50 ? "text-primary-dark" : "text-red-600"
              }`}
            >
              {finished.percentage}%
            </p>
            <p className="mt-1 text-sm text-ink/60">
              {finished.score} من {finished.max} نقطة
            </p>
          </div>
          {finished.feedback && (
            <div className="rounded-xl bg-ink/5 p-3 text-sm leading-relaxed">
              <span className="font-medium">ملاحظة المدرّس: </span>
              {finished.feedback}
            </div>
          )}
          {finished.uploads.some((u) => (u.annotations?.length ?? 0) > 0) && (
            <p className="text-xs text-ink/50">
              اضغط الأرقام الحمراء على الصورة لقراءة تعليقات المدرّس.
            </p>
          )}
          <div className="space-y-4">
            {finished.uploads.map((u) => (
              <ImageAnnotator
                key={u.id}
                attachmentId={u.id}
                mimeType={u.mimeType}
                annotations={u.annotations ?? []}
              />
            ))}
          </div>
          <div className="border-t border-line pt-4">
            <h3 className="mb-2 font-display font-semibold">
              اعتراض على التصحيح
            </h3>
            <AppealBox
              sessionId={finished.sessionId}
              appealable
              appeal={finished.appeal}
            />
          </div>
          {canStart && (
            <button onClick={start} disabled={busy} className="btn-primary">
              بدء محاولة جديدة
            </button>
          )}
        </div>
      )}
    </div>
  );
}
