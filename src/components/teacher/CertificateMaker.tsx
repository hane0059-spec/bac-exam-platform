"use client";
// src/components/teacher/CertificateMaker.tsx
// شهادة التقدير الرسمية الملوّنة: معاينة حيّة على canvas مع تنزيل صورة (PNG) أو PDF أو طباعة.
// يستعمله المدرّس (مع زرّ إشعار الطالب) والطالب (تنزيل/طباعة فقط) بنفس التصميم.
import { useCallback, useEffect, useRef, useState } from "react";
import type { CertificateData } from "@/lib/certificate";
import {
  CERT_W,
  CERT_H,
  CERT_THEMES,
  DEFAULT_FLAG_COLORS,
  EMBLEMS,
  drawCertificate,
  themeById,
  type CertFonts,
  type CertThemeId,
  type EmblemId,
} from "@/lib/certificateArt";
import { jpegToPdf } from "@/lib/pdfImage";
import { printHtmlInHiddenFrame } from "@/lib/printHtml";
import { canvasBlob, downloadBlob as download, loadCertFonts, safeFileName } from "@/lib/certificateClient";

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
  // نموذج الإطار والشعار (تُحفَظ على الجهاز فقط — لا شيء يُرفَع للخادم).
  const [themeId, setThemeId] = useState<CertThemeId>("emerald");
  const [flagColors, setFlagColors] = useState<[string, string, string]>(DEFAULT_FLAG_COLORS);
  // الشعار: none | أحد الجاهزة | upload (صورة المدرّس)
  const [emblemSel, setEmblemSel] = useState<"none" | EmblemId | "upload">("none");
  const [logoImg, setLogoImg] = useState<HTMLImageElement | HTMLCanvasElement | null>(null);
  const [logoError, setLogoError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"" | "png" | "pdf" | "notify">("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("cert-theme");
      if (saved) setThemeId(themeById(saved).id);
      const flag = JSON.parse(localStorage.getItem("cert-flag") ?? "null");
      if (Array.isArray(flag) && flag.length === 3 && flag.every((c) => /^#[0-9a-f]{6}$/i.test(c))) {
        setFlagColors(flag as [string, string, string]);
      }
      const em = localStorage.getItem("cert-emblem");
      if (em === "upload") {
        const url = localStorage.getItem("cert-logo");
        if (url) {
          const img = new Image();
          img.onload = () => {
            setLogoImg(img);
            setEmblemSel("upload");
          };
          img.src = url;
        }
      } else if (em && EMBLEMS.some((e) => e.id === em)) {
        setEmblemSel(em as EmblemId);
      }
    } catch {
      // التخزين غير متاح — تبقى الافتراضات.
    }
  }, []);

  function save(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // تجاهل.
    }
  }
  function pickTheme(id: CertThemeId) {
    setThemeId(id);
    save("cert-theme", id);
  }
  function setFlag(i: 0 | 1 | 2, color: string) {
    setFlagColors((prev) => {
      const next: [string, string, string] = [prev[0], prev[1], prev[2]];
      next[i] = color;
      save("cert-flag", JSON.stringify(next));
      return next;
    });
  }
  function pickEmblem(sel: "none" | EmblemId) {
    setEmblemSel(sel);
    save("cert-emblem", sel);
  }
  function onLogoFile(file: File | undefined) {
    setLogoError("");
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      setLogoError("اختر صورة PNG أو JPG أو WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setLogoError("الصورة كبيرة (الحدّ 5MB).");
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      // تصغير إلى ≤600px ليخفّ الحفظ والرسم.
      const k = Math.min(1, 600 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.naturalWidth * k));
      c.height = Math.max(1, Math.round(img.naturalHeight * k));
      c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      setLogoImg(c);
      setEmblemSel("upload");
      save("cert-emblem", "upload");
      try {
        localStorage.setItem("cert-logo", c.toDataURL("image/png"));
      } catch {
        // الحفظ اختياري.
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setLogoError("تعذّر قراءة الصورة.");
    };
    img.src = url;
    if (fileRef.current) fileRef.current.value = "";
  }

  const draw = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!fontsRef.current) fontsRef.current = await loadCertFonts();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, CERT_W, CERT_H);
    drawCertificate(ctx, { ...data, closing }, fontsRef.current, {
      themeId,
      flagColors,
      emblem: emblemSel === "none" || emblemSel === "upload" ? null : emblemSel,
      logoImage: emblemSel === "upload" ? logoImg : null,
    });
    setReady(true);
  }, [data, closing, themeId, flagColors, emblemSel, logoImg]);

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

      <div>
        <p className="mb-2 text-sm font-medium">اختر نموذج الإطار</p>
        <div className="flex flex-wrap gap-2">
          {CERT_THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => pickTheme(t.id)}
              aria-pressed={themeId === t.id}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                themeId === t.id
                  ? "border-primary bg-primary-light text-primary-dark"
                  : "border-line hover:bg-ink/5"
              }`}
            >
              <span className="flex overflow-hidden rounded-full ring-1 ring-ink/20">
                <span className="h-5 w-5" style={{ background: t.swatch[0] }} />
                <span className="h-5 w-5" style={{ background: t.swatch[1] }} />
              </span>
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {themeId === "flag" && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-3 text-sm">
          <span className="font-medium">ألوان العلم (من الخارج إلى الداخل):</span>
          {([0, 1, 2] as const).map((i) => (
            <label key={i} className="flex items-center gap-1.5">
              <input
                type="color"
                value={flagColors[i]}
                onChange={(e) => setFlag(i, e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border border-line bg-transparent"
                aria-label={`لون الشريط ${i + 1}`}
              />
              <span className="text-ink/60">{i + 1}</span>
            </label>
          ))}
          <button
            type="button"
            onClick={() => {
              setFlagColors(DEFAULT_FLAG_COLORS);
              save("cert-flag", JSON.stringify(DEFAULT_FLAG_COLORS));
            }}
            className="rounded-lg border border-line px-2 py-1 text-xs hover:bg-ink/5"
          >
            الألوان الافتراضية
          </button>
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-medium">الشعار (اختياري)</p>
        <div className="flex flex-wrap items-center gap-2">
          {([{ id: "none", name: "بلا شعار" }, ...EMBLEMS] as { id: "none" | EmblemId; name: string }[]).map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => pickEmblem(e.id)}
              aria-pressed={emblemSel === e.id}
              className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                emblemSel === e.id
                  ? "border-primary bg-primary-light text-primary-dark"
                  : "border-line hover:bg-ink/5"
              }`}
            >
              {e.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-pressed={emblemSel === "upload"}
            className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
              emblemSel === "upload"
                ? "border-primary bg-primary-light text-primary-dark"
                : "border-dashed border-primary text-primary hover:bg-primary-light"
            }`}
          >
            {logoImg ? "تغيير صورة الشعار" : "＋ رفع شعارك"}
          </button>
          {logoImg && emblemSel !== "upload" && (
            <button
              type="button"
              onClick={() => {
                setEmblemSel("upload");
                save("cert-emblem", "upload");
              }}
              className="rounded-xl border border-line px-3 py-2 text-sm hover:bg-ink/5"
            >
              استعمال شعاري المرفوع
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => onLogoFile(e.target.files?.[0])}
          />
        </div>
        {logoError && <p className="mt-1 text-sm text-red-700">{logoError}</p>}
        <p className="mt-1 text-xs text-ink/50">
          الصورة تبقى في متصفّحك فقط ولا تُرفَع للمنصّة. يُفضَّل شعار بخلفية شفّافة.
        </p>
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
