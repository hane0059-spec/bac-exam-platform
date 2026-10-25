"use client";
// src/components/teacher/GeneralCertificateMaker.tsx
// شهادة عامّة فارغة يعبّئها المستخدم (المُكرَّم + الجهة + السبب + شارة + تاريخ + موقِّع) بنماذج إطار متعدّدة،
// مع إمكان إدخال عدّة أسماء بالسبب نفسه وتنزيلها ملفّ PDF واحد. كل شيء في المتصفّح، لا يُخزَّن على الخادم.
import { useCallback, useEffect, useRef, useState } from "react";
import { CERT_H, CERT_W, type CertFonts } from "@/lib/certificateArt";
import {
  GENERAL_TITLES,
  drawGeneralCertificate,
  parseRecipients,
  type GeneralCertData,
} from "@/lib/certificateGeneral";
import {
  canvasBlob,
  downloadBlob,
  exportPdf,
  exportPng,
  loadCertFonts,
  printCanvas,
  safeFileName,
} from "@/lib/certificateClient";
import { jpegsToPdf } from "@/lib/pdfImage";
import CertStylePicker, { useCertStyle } from "@/components/teacher/CertStylePicker";

function todayStr(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

const SAVED_KEY = "cert-general-defaults";

export default function GeneralCertificateMaker({
  defaultOrg,
  defaultSigner,
  defaultSignerTitle,
}: {
  defaultOrg: string;
  defaultSigner: string;
  defaultSignerTitle: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fontsRef = useRef<CertFonts | null>(null);
  const [ready, setReady] = useState(false);
  const { ctl, renderOpts } = useCertStyle();

  const [title, setTitle] = useState("شهادة تقدير");
  const [recipient, setRecipient] = useState("");
  const [more, setMore] = useState("");
  const [org, setOrg] = useState(defaultOrg);
  const [reason, setReason] = useState("");
  const [badge, setBadge] = useState("");
  const [dateStr, setDateStr] = useState(todayStr());
  const [signerName, setSignerName] = useState(defaultSigner);
  const [signerTitle, setSignerTitle] = useState(defaultSignerTitle);
  const [busy, setBusy] = useState<"" | "png" | "pdf" | "all">("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  // آخر جهة/موقِّع استُعمِلا على هذا الجهاز.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "null");
      if (saved && typeof saved === "object") {
        if (typeof saved.org === "string" && saved.org) setOrg(saved.org);
        if (typeof saved.signerName === "string" && saved.signerName) setSignerName(saved.signerName);
        if (typeof saved.signerTitle === "string" && saved.signerTitle) setSignerTitle(saved.signerTitle);
      }
    } catch {
      // تجاهل.
    }
  }, []);
  function remember() {
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify({ org, signerName, signerTitle }));
    } catch {
      // تجاهل.
    }
  }

  const names = [recipient.trim(), ...parseRecipients(more)].filter(Boolean);
  const uniqueNames = [...new Set(names)];
  const previewName = recipient.trim() || "اسم المُكرَّم";

  const base = (name: string): GeneralCertData => ({
    title,
    recipient: name,
    org,
    reason,
    badge,
    dateStr,
    signerName,
    signerTitle,
  });

  const optsKey = JSON.stringify([renderOpts.themeId, renderOpts.flagColors, renderOpts.emblem, Boolean(renderOpts.logoImage)]);
  const draw = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!fontsRef.current) fontsRef.current = await loadCertFonts();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, CERT_W, CERT_H);
    drawGeneralCertificate(ctx, base(previewName), fontsRef.current, renderOpts);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, previewName, org, reason, badge, dateStr, signerName, signerTitle, optsKey, renderOpts.logoImage]);

  useEffect(() => {
    void draw();
  }, [draw]);

  const baseName = safeFileName(`${title} - ${previewName}`);

  async function single(kind: "png" | "pdf") {
    if (!canvasRef.current) return;
    setError("");
    setBusy(kind);
    remember();
    try {
      if (kind === "png") await exportPng(canvasRef.current, baseName);
      else await exportPdf(canvasRef.current, baseName);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر إنشاء الملفّ.");
    }
    setBusy("");
  }

  async function allPdf() {
    if (uniqueNames.length === 0) return;
    setError("");
    setBusy("all");
    setProgress(0);
    remember();
    try {
      const fonts = fontsRef.current ?? (await loadCertFonts());
      const c = document.createElement("canvas");
      c.width = CERT_W;
      c.height = CERT_H;
      const ctx = c.getContext("2d");
      if (!ctx) throw new Error("المتصفّح لا يدعم الرسم.");
      const pages: { jpeg: Uint8Array; widthPx: number; heightPx: number }[] = [];
      for (let i = 0; i < uniqueNames.length; i++) {
        ctx.clearRect(0, 0, CERT_W, CERT_H);
        drawGeneralCertificate(ctx, base(uniqueNames[i]), fonts, renderOpts);
        const blob = await canvasBlob(c, "image/jpeg", 0.88);
        pages.push({ jpeg: new Uint8Array(await blob.arrayBuffer()), widthPx: CERT_W, heightPx: CERT_H });
        setProgress(i + 1);
        await new Promise((r) => setTimeout(r, 0));
      }
      downloadBlob(
        new Blob([jpegsToPdf(pages) as BlobPart], { type: "application/pdf" }),
        `${safeFileName(`${title} - ${uniqueNames.length} اسم`)}.pdf`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر إنشاء الملفّ.");
    }
    setBusy("");
  }

  return (
    <div className="space-y-5">
      <div className="card grid gap-3 p-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">عنوان الشهادة</span>
          <input
            list="cert-titles"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={40}
            dir="auto"
            className="field"
          />
          <datalist id="cert-titles">
            {GENERAL_TITLES.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">الجهة المانحة (المؤسّسة)</span>
          <input value={org} onChange={(e) => setOrg(e.target.value)} maxLength={70} dir="auto" className="field" />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-medium">اسم المُكرَّم</span>
          <input
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            maxLength={70}
            dir="auto"
            placeholder="مثل: أحمد محمد الخالد"
            className="field"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-medium">سبب المنح</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={300}
            rows={3}
            dir="auto"
            placeholder="مثل: تقديراً لجهوده المتميّزة في خدمة المجتمع المدرسي وحسن أخلاقه…"
            className="field"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-medium">شارة في شريط (اختياري)</span>
          <input
            value={badge}
            onChange={(e) => setBadge(e.target.value)}
            maxLength={50}
            dir="auto"
            placeholder="مثل: المركز الأول — الطالب المثالي — خرّيج الدفعة"
            className="field"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">التاريخ</span>
          <input value={dateStr} onChange={(e) => setDateStr(e.target.value)} maxLength={30} dir="auto" className="field" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">اسم الموقِّع</span>
            <input value={signerName} onChange={(e) => setSignerName(e.target.value)} maxLength={50} dir="auto" className="field" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">صفته</span>
            <input value={signerTitle} onChange={(e) => setSignerTitle(e.target.value)} maxLength={40} dir="auto" className="field" />
          </label>
        </div>
        <details className="text-sm sm:col-span-2">
          <summary className="cursor-pointer font-medium text-primary">＋ أسماء أخرى بالسبب نفسه (سطر لكل اسم)</summary>
          <textarea
            value={more}
            onChange={(e) => setMore(e.target.value)}
            rows={5}
            dir="auto"
            placeholder={"ليلى أحمد\nخالد عمر\n…"}
            className="field mt-2"
          />
          <p className="mt-1 text-xs text-ink/50">تُنتَج صفحة لكل اسم في ملفّ PDF واحد (حتى 200 اسم).</p>
        </details>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        <canvas ref={canvasRef} width={CERT_W} height={CERT_H} className="block h-auto w-full" aria-label="معاينة الشهادة" />
        {!ready && <p className="p-3 text-center text-sm text-ink/50">جارٍ تجهيز الشهادة…</p>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => single("pdf")}
          disabled={!ready || busy !== "" || !recipient.trim()}
          className="btn-primary disabled:opacity-60"
        >
          {busy === "pdf" ? "جارٍ الإنشاء…" : "تنزيل PDF"}
        </button>
        <button
          type="button"
          onClick={() => single("png")}
          disabled={!ready || busy !== "" || !recipient.trim()}
          className="rounded-xl border border-primary px-5 py-3 font-medium text-primary transition hover:bg-primary-light disabled:opacity-60"
        >
          {busy === "png" ? "جارٍ الإنشاء…" : "تنزيل صورة (PNG)"}
        </button>
        <button
          type="button"
          onClick={() => canvasRef.current && printCanvas(canvasRef.current, baseName)}
          disabled={!ready || !recipient.trim()}
          className="rounded-xl border border-line px-5 py-3 font-medium transition hover:bg-ink/5 disabled:opacity-60"
        >
          طباعة
        </button>
        {uniqueNames.length > 1 && (
          <button
            type="button"
            onClick={allPdf}
            disabled={busy !== ""}
            className="rounded-xl border border-gold px-5 py-3 font-medium text-gold transition hover:bg-gold/10 disabled:opacity-60"
          >
            {busy === "all"
              ? `جارٍ الإنشاء… ${progress} / ${uniqueNames.length}`
              : `PDF لكل الأسماء (${uniqueNames.length})`}
          </button>
        )}
        {!recipient.trim() && <span className="text-xs text-ink/50">اكتب اسم المُكرَّم لتفعيل التنزيل.</span>}
      </div>
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <CertStylePicker ctl={ctl} />
    </div>
  );
}
