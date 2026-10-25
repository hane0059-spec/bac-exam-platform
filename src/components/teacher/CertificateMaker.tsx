"use client";
// src/components/teacher/CertificateMaker.tsx
// شهادة التقدير الرسمية الملوّنة: معاينة حيّة على canvas مع تنزيل صورة (PNG) أو PDF أو طباعة.
// يستعمله المدرّس (مع زرّ إشعار الطالب) والطالب (تنزيل/طباعة فقط) بنفس التصميم.
import { useCallback, useEffect, useRef, useState } from "react";
import type { CertificateData } from "@/lib/certificate";
import { CERT_W, CERT_H, drawCertificate, type CertFonts } from "@/lib/certificateArt";
import { jpegToPdf } from "@/lib/pdfImage";
import { printHtmlInHiddenFrame } from "@/lib/printHtml";

function familyOf(cssVar: string, fallback: string): string {
  const el = document.createElement("span");
  el.style.fontFamily = `var(${cssVar})`;
  el.style.position = "absolute";
  el.style.visibility = "hidden";
  document.body.appendChild(el);
  const f = getComputedStyle(el).fontFamily;
  el.remove();
  return f && !f.includes("var(") ? `${f}, ${fallback}` : fallback;
}

async function loadFonts(): Promise<CertFonts> {
  const fonts: CertFonts = {
    title: familyOf("--font-reem", "'Reem Kufi', Tahoma, sans-serif"),
    body: familyOf("--font-amiri", "Amiri, 'Traditional Arabic', serif"),
  };
  try {
    await Promise.all([
      document.fonts.load(`700 80px ${fonts.title}`, "شهادة تقدير إتقان 0123456789%"),
      document.fonts.load(`400 40px ${fonts.body}`, "الطالب تتشرف بمنح هذه الشهادة"),
      document.fonts.load(`700 40px ${fonts.body}`, "الطالب المدرس"),
    ]);
    await document.fonts.ready;
  } catch {
    // الخطوط الاحتياطية تكفي.
  }
  return fonts;
}

function safeFileName(s: string): string {
  return s.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "").trim().slice(0, 60) || "شهادة";
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("تعذّر إنشاء الملفّ"))), type, quality)
  );
}

export default function CertificateMaker({
  data,
  notifyUrl,
  allowCustomClosing = false,
}: {
  data: CertificateData;
  /** مسار إشعار الطالب (للمدرّس فقط). */
  notifyUrl?: string;
  /** يسمح للمدرّس بتعديل عبارة الختام. */
  allowCustomClosing?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fontsRef = useRef<CertFonts | null>(null);
  const [ready, setReady] = useState(false);
  const [closing, setClosing] = useState(data.closing ?? "");
  const [busy, setBusy] = useState<"" | "png" | "pdf" | "notify">("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const draw = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!fontsRef.current) fontsRef.current = await loadFonts();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, CERT_W, CERT_H);
    drawCertificate(ctx, { ...data, closing }, fontsRef.current);
    setReady(true);
  }, [data, closing]);

  useEffect(() => {
    void draw();
  }, [draw]);

  const baseName = safeFileName(`شهادة تقدير - ${data.studentName}`);

  async function savePng() {
    if (!canvasRef.current) return;
    setError("");
    setBusy("png");
    try {
      download(await canvasBlob(canvasRef.current, "image/png"), `${baseName}.png`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر التنزيل.");
    }
    setBusy("");
  }

  async function savePdf() {
    if (!canvasRef.current) return;
    setError("");
    setBusy("pdf");
    try {
      const jpeg = new Uint8Array(await (await canvasBlob(canvasRef.current, "image/jpeg", 0.93)).arrayBuffer());
      const pdf = jpegToPdf(jpeg, CERT_W, CERT_H);
      download(new Blob([pdf as BlobPart], { type: "application/pdf" }), `${baseName}.pdf`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر إنشاء الملفّ.");
    }
    setBusy("");
  }

  function print() {
    if (!canvasRef.current) return;
    const src = canvasRef.current.toDataURL("image/jpeg", 0.93);
    printHtmlInHiddenFrame(
      `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${baseName}</title>
<style>@page{size:A4 landscape;margin:0}html,body{margin:0;height:100%}img{display:block;width:100%;height:100%;object-fit:contain}
body{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body><img src="${src}" alt=""></body></html>`
    );
  }

  async function notifyStudent() {
    if (!notifyUrl) return;
    setError("");
    setMsg("");
    setBusy("notify");
    const res = await fetch(notifyUrl, { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) {
      setError(d.error ?? "تعذّر إرسال الإشعار.");
      return;
    }
    setMsg(d.alreadyNotified ? "أُشعِر الطالب بذلك سابقاً." : "تمّ إشعار الطالب — سيجد الشهادة في صفحته.");
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        <canvas
          ref={canvasRef}
          width={CERT_W}
          height={CERT_H}
          className="block h-auto w-full"
          aria-label={`شهادة تقدير — ${data.studentName}`}
        />
        {!ready && <p className="p-3 text-center text-sm text-ink/50">جارٍ تجهيز الشهادة…</p>}
      </div>

      {allowCustomClosing && (
        <label className="block max-w-xl">
          <span className="mb-1 block text-sm font-medium">عبارة الختام (اختياري)</span>
          <input
            type="text"
            dir="auto"
            maxLength={90}
            value={closing}
            onChange={(e) => setClosing(e.target.value)}
            placeholder="مثل: بارك الله فيك ونفع بك — واصل تفوّقك"
            className="field"
          />
        </label>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={savePdf}
          disabled={!ready || busy !== ""}
          className="btn-primary disabled:opacity-60"
        >
          {busy === "pdf" ? "جارٍ الإنشاء…" : "تنزيل PDF"}
        </button>
        <button
          type="button"
          onClick={savePng}
          disabled={!ready || busy !== ""}
          className="rounded-xl border border-primary px-5 py-3 font-medium text-primary transition hover:bg-primary-light disabled:opacity-60"
        >
          {busy === "png" ? "جارٍ الإنشاء…" : "تنزيل صورة (PNG)"}
        </button>
        <button
          type="button"
          onClick={print}
          disabled={!ready}
          className="rounded-xl border border-line px-5 py-3 font-medium transition hover:bg-ink/5 disabled:opacity-60"
        >
          طباعة
        </button>
        {notifyUrl && (
          <button
            type="button"
            onClick={notifyStudent}
            disabled={busy !== ""}
            className="rounded-xl border border-gold px-5 py-3 font-medium text-gold transition hover:bg-gold/10 disabled:opacity-60"
          >
            {busy === "notify" ? "…" : "إشعار الطالب بالشهادة"}
          </button>
        )}
      </div>
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {msg && <p className="rounded-xl bg-primary-light p-3 text-sm text-primary-dark">{msg}</p>}
    </div>
  );
}
