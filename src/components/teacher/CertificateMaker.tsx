"use client";
// src/components/teacher/CertificateMaker.tsx
// شهادة التقدير الرسمية الملوّنة: معاينة حيّة على canvas مع تنزيل صورة (PNG) أو PDF أو طباعة.
// المدرّس: يختار النموذج/الشعار/الختام ويُشعر الطالب (فيُحفَظ تصميمه). الطالب (`issued`): يرى الشهادة بتصميم مدرّسه
// دون أي أداة اختيار، مع تنزيل/طباعة فقط.
import { useCallback, useEffect, useRef, useState } from "react";
import type { CertificateData } from "@/lib/certificate";
import type { IssuedStyle } from "@/lib/certIssue";
import { CERT_W, CERT_H, drawCertificate, type CertFonts, type CertRenderOptions } from "@/lib/certificateArt";
import {
  exportPdf,
  exportPng,
  loadCertFonts,
  printCanvas,
  safeFileName,
} from "@/lib/certificateClient";
import CertStylePicker, { useCertStyle } from "@/components/teacher/CertStylePicker";

/** أقصى حجم لشعار مرفوع يُرسَل مع الإشعار (حرفاً من data URL). */
const MAX_LOGO_CHARS = 260_000;

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export default function CertificateMaker({
  data,
  notifyUrl,
  allowCustomClosing = false,
  issued,
  studentView = false,
}: {
  data: CertificateData;
  /** مسار إشعار الطالب (للمدرّس فقط). */
  notifyUrl?: string;
  /** يسمح للمدرّس بتعديل عبارة الختام. */
  allowCustomClosing?: boolean;
  /** عرض الطالب: لا أدوات اختيار؛ التصميم الذي أصدره المدرّس (أو الافتراضي إن لم يوجد). */
  studentView?: boolean;
  issued?: IssuedStyle | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fontsRef = useRef<CertFonts | null>(null);
  const [ready, setReady] = useState(false);
  const [closing, setClosing] = useState(data.closing ?? "");
  const { ctl, renderOpts: deviceOpts } = useCertStyle();
  // عرض الطالب: ثبّت تصميم المدرّس (يحمّل شعاره المرفوع إن وُجد) ولا تقرأ تفضيلات الجهاز.
  const [lockedOpts, setLockedOpts] = useState<CertRenderOptions | null>(null);
  useEffect(() => {
    if (!studentView) return;
    let cancelled = false;
    (async () => {
      const logoImage = issued?.logo ? await loadImage(issued.logo) : null;
      if (cancelled) return;
      setLockedOpts({
        themeId: issued?.theme ?? "emerald",
        flagColors: issued?.flag,
        emblem: issued?.emblem ?? null,
        logoImage,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [studentView, issued]);
  const renderOpts: CertRenderOptions = studentView ? lockedOpts ?? { themeId: issued?.theme ?? "emerald" } : deviceOpts;
  const [busy, setBusy] = useState<"" | "png" | "pdf" | "notify">("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const optsKey = JSON.stringify([
    renderOpts.themeId,
    renderOpts.flagColors,
    renderOpts.emblem,
    Boolean(renderOpts.logoImage),
  ]);

  const draw = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (studentView && !lockedOpts) return; // انتظر تحميل تصميم المدرّس (وشعاره) قبل الرسم
    if (!fontsRef.current) fontsRef.current = await loadCertFonts();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, CERT_W, CERT_H);
    drawCertificate(ctx, { ...data, closing }, fontsRef.current, renderOpts);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, closing, optsKey, renderOpts.logoImage, studentView, lockedOpts]);

  useEffect(() => {
    void draw();
  }, [draw]);

  const baseName = safeFileName(`${data.honor === "مشارك" ? "شهادة مشاركة" : "شهادة تقدير"} - ${data.studentName}`);

  async function run(kind: "png" | "pdf") {
    if (!canvasRef.current) return;
    setError("");
    setBusy(kind);
    try {
      if (kind === "png") await exportPng(canvasRef.current, baseName);
      else await exportPdf(canvasRef.current, baseName);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر إنشاء الملفّ.");
    }
    setBusy("");
  }

  async function notifyStudent() {
    if (!notifyUrl) return;
    setError("");
    setMsg("");
    setBusy("notify");
    // تصميم المدرّس الحالي يُحفَظ مع الإشعار ليراه الطالب كما هو (النموذج/الألوان/الشعار/الختام).
    let logo: string | undefined;
    let logoDropped = false;
    if (ctl.emblemSel === "upload") {
      try {
        const url = localStorage.getItem("cert-logo");
        if (url && url.length <= MAX_LOGO_CHARS) logo = url;
        else if (url) logoDropped = true;
      } catch {
        // لا شعار.
      }
    }
    const style = {
      theme: renderOpts.themeId ?? "emerald",
      flag: renderOpts.flagColors,
      emblem: renderOpts.emblem ?? null,
      closing: closing.trim() || undefined,
      logo,
    };
    const res = await fetch(notifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ style }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) {
      setError(d.error ?? "تعذّر إرسال الإشعار.");
      return;
    }
    const base = d.renotified
      ? "أُعيد إشعار الطالب بشهادته المحدَّثة — سيجدها بهذا التصميم في صفحته."
      : d.alreadyNotified
        ? d.styleUpdated
          ? "أُشعِر الطالب قبل لحظات — وحُدِّث تصميم شهادته بما تراه الآن."
          : "أُشعِر الطالب قبل لحظات."
        : "تمّ إشعار الطالب — سيجد الشهادة بهذا التصميم في صفحته.";
    setMsg(logoDropped ? `${base} (الشعار المرفوع كبير جداً فلم يُرسَل؛ استعمل صورة أصغر.)` : base);
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        <canvas
          ref={canvasRef}
          width={CERT_W}
          height={CERT_H}
          className="block h-auto w-full"
          aria-label={`شهادة — ${data.studentName}`}
        />
        {!ready && <p className="p-3 text-center text-sm text-ink/50">جارٍ تجهيز الشهادة…</p>}
      </div>

      {!studentView && <CertStylePicker ctl={ctl} />}

      {allowCustomClosing && !studentView && (
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
          onClick={() => run("pdf")}
          disabled={!ready || busy !== ""}
          className="btn-primary disabled:opacity-60"
        >
          {busy === "pdf" ? "جارٍ الإنشاء…" : "تنزيل PDF"}
        </button>
        <button
          type="button"
          onClick={() => run("png")}
          disabled={!ready || busy !== ""}
          className="rounded-xl border border-primary px-5 py-3 font-medium text-primary transition hover:bg-primary-light disabled:opacity-60"
        >
          {busy === "png" ? "جارٍ الإنشاء…" : "تنزيل صورة (PNG)"}
        </button>
        <button
          type="button"
          onClick={() => canvasRef.current && printCanvas(canvasRef.current, baseName)}
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
