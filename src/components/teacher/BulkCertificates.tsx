"use client";
// src/components/teacher/BulkCertificates.tsx
// شهادات كل طلاب الاختبار في ملفّ PDF واحد (صفحة لكل طالب): يختار المدرّس من يدخل، والنموذج، ثم يُنشئ الملفّ في متصفّحه.
import { useEffect, useMemo, useState } from "react";
import type { CertificateData } from "@/lib/certificate";
import { gradeInfo, CERTIFICATE_THRESHOLD } from "@/lib/certificate";
import { CERT_W, CERT_H, CERT_THEMES, drawCertificate, type CertThemeId } from "@/lib/certificateArt";
import {
  canvasBlob,
  downloadBlob,
  loadCertFonts,
  readSavedCertStyle,
  safeFileName,
  type SavedCertStyle,
} from "@/lib/certificateClient";
import { jpegsToPdf } from "@/lib/pdfImage";

export interface BulkItem {
  sessionId: string;
  data: CertificateData;
}

export default function BulkCertificates({
  quizTitle,
  items,
}: {
  quizTitle: string;
  items: BulkItem[];
}) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(items.filter((i) => i.data.percentage >= CERTIFICATE_THRESHOLD).map((i) => i.sessionId))
  );
  const [style, setStyle] = useState<SavedCertStyle | null>(null);
  const [themeId, setThemeId] = useState<CertThemeId>("emerald");
  const [closing, setClosing] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    void readSavedCertStyle().then((s) => {
      setStyle(s);
      setThemeId(s.themeId);
    });
  }, []);

  const chosen = useMemo(() => items.filter((i) => selected.has(i.sessionId)), [items, selected]);
  const passers = items.filter((i) => i.data.percentage >= CERTIFICATE_THRESHOLD).length;
  const participants = items.length - passers;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function generate() {
    if (chosen.length === 0 || !style) return;
    setError("");
    setBusy(true);
    setProgress(0);
    try {
      const fonts = await loadCertFonts();
      const canvas = document.createElement("canvas");
      canvas.width = CERT_W;
      canvas.height = CERT_H;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("المتصفّح لا يدعم الرسم.");
      const pages: { jpeg: Uint8Array; widthPx: number; heightPx: number }[] = [];
      for (let i = 0; i < chosen.length; i++) {
        ctx.clearRect(0, 0, CERT_W, CERT_H);
        drawCertificate(ctx, { ...chosen[i].data, closing }, fonts, {
          themeId,
          flagColors: style.flagColors,
          emblem: style.emblem,
          logoImage: style.logoImage,
        });
        const blob = await canvasBlob(canvas, "image/jpeg", 0.88);
        pages.push({ jpeg: new Uint8Array(await blob.arrayBuffer()), widthPx: CERT_W, heightPx: CERT_H });
        setProgress(i + 1);
        await new Promise((r) => setTimeout(r, 0)); // يترك للمتصفّح فرصة التحديث
      }
      const pdf = jpegsToPdf(pages);
      downloadBlob(new Blob([pdf as BlobPart], { type: "application/pdf" }), `${safeFileName(`شهادات - ${quizTitle}`)}.pdf`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر إنشاء الملفّ.");
    }
    setBusy(false);
  }

  if (items.length === 0) {
    return (
      <div className="card p-8 text-center text-ink/60">
        لا توجد نتائج معتمدة بعد لإصدار شهادات (تنتظر الجلسات التصحيح أو لم يؤدِّ أحد).
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-3 p-4">
        <p className="text-sm text-ink/70">
          ملفّ واحد بصفحة لكل طالب (أفضل محاولة معتمدة). الناجحون ({passers}) محدَّدون تلقائياً
          {participants > 0 && <>، و{participants} دون حدّ النجاح ({CERTIFICATE_THRESHOLD}%) غير محدَّدين — فعّلهم لتصدر لهم «شهادة مشاركة»</>}.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium">نموذج الإطار</span>
            <select
              value={themeId}
              onChange={(e) => setThemeId(e.target.value as CertThemeId)}
              className="field"
            >
              {CERT_THEMES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-[14rem] flex-1 text-sm">
            <span className="mb-1 block font-medium">عبارة ختام موحّدة (اختياري)</span>
            <input
              type="text"
              dir="auto"
              maxLength={90}
              value={closing}
              onChange={(e) => setClosing(e.target.value)}
              placeholder="الفارغة ← عبارة تناسب كل درجة"
              className="field"
            />
          </label>
        </div>
        <p className="text-xs text-ink/50">
          يُستعمل الشعار وألوان العلم المحفوظان على هذا الجهاز من آخر مرّة فتحتَ فيها شهادة واحدة.
        </p>
      </div>

      <div className="card overflow-x-auto p-2">
        <table className="w-full text-sm">
          <thead className="text-ink/50">
            <tr>
              <th className="p-2 text-right">
                <input
                  type="checkbox"
                  aria-label="تحديد الكل"
                  checked={selected.size === items.length}
                  onChange={(e) =>
                    setSelected(e.target.checked ? new Set(items.map((i) => i.sessionId)) : new Set())
                  }
                  className="accent-primary"
                />
              </th>
              <th className="p-2 text-right">الطالب</th>
              <th className="p-2 text-right">النسبة</th>
              <th className="p-2 text-right">التقدير</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => {
              const info = gradeInfo(i.data.percentage);
              return (
                <tr key={i.sessionId} className="border-t border-line">
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={selected.has(i.sessionId)}
                      onChange={() => toggle(i.sessionId)}
                      aria-label={`شهادة ${i.data.studentName}`}
                      className="accent-primary"
                    />
                  </td>
                  <td className="p-2">{i.data.studentName}</td>
                  <td className="p-2 font-medium">{Math.round(i.data.percentage * 10) / 10}%</td>
                  <td className="p-2">
                    {info ? (
                      <span className="rounded-full bg-primary-light px-2 py-0.5 text-xs text-primary-dark">
                        {info.honor} ({info.letter})
                      </span>
                    ) : (
                      <span className="rounded-full bg-ink/10 px-2 py-0.5 text-xs text-ink/60">مشارك</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={generate}
          disabled={busy || chosen.length === 0 || !style}
          className="btn-primary disabled:opacity-60"
        >
          {busy ? `جارٍ الإنشاء… ${progress} / ${chosen.length}` : `تنزيل PDF (${chosen.length} شهادة)`}
        </button>
        {busy && (
          <div className="h-2 w-48 overflow-hidden rounded-full bg-ink/10">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.round((progress / Math.max(1, chosen.length)) * 100)}%` }}
            />
          </div>
        )}
      </div>
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}
