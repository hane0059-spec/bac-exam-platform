"use client";
// src/components/teacher/CertStylePicker.tsx
// اختيار نموذج الإطار (بمعاينات مصغّرة) وألوان العلم والشعار (جاهز أو مرفوع) — مشترك بين شهادة الإنجاز
// والشهادة العامّة. كل اختيارات المستخدم تُحفَظ على جهازه فقط (localStorage)، ولا يُرفَع شيء للخادم.
import { useEffect, useRef, useState } from "react";
import {
  CERT_H,
  CERT_THEMES,
  CERT_W,
  DEFAULT_FLAG_COLORS,
  EMBLEMS,
  themeById,
  type CertFonts,
  type CertRenderOptions,
  type CertThemeId,
  type EmblemId,
} from "@/lib/certificateArt";
import { SAMPLE_GENERAL, drawGeneralCertificate } from "@/lib/certificateGeneral";
import { loadCertFonts } from "@/lib/certificateClient";

type EmblemSel = "none" | EmblemId | "upload";

export function useCertStyle() {
  const [themeId, setThemeId] = useState<CertThemeId>("emerald");
  const [flagColors, setFlagColors] = useState<[string, string, string]>(DEFAULT_FLAG_COLORS);
  const [emblemSel, setEmblemSel] = useState<EmblemSel>("none");
  const [logoImg, setLogoImg] = useState<HTMLImageElement | HTMLCanvasElement | null>(null);
  const [logoError, setLogoError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

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

  const ctl = {
    themeId,
    flagColors,
    emblemSel,
    logoImg,
    logoError,
    fileRef,
    pickTheme(id: CertThemeId) {
      setThemeId(id);
      save("cert-theme", id);
    },
    setFlag(i: 0 | 1 | 2, color: string) {
      setFlagColors((prev) => {
        const next: [string, string, string] = [prev[0], prev[1], prev[2]];
        next[i] = color;
        save("cert-flag", JSON.stringify(next));
        return next;
      });
    },
    resetFlag() {
      setFlagColors(DEFAULT_FLAG_COLORS);
      save("cert-flag", JSON.stringify(DEFAULT_FLAG_COLORS));
    },
    pickEmblem(sel: "none" | EmblemId) {
      setEmblemSel(sel);
      save("cert-emblem", sel);
    },
    useUpload() {
      setEmblemSel("upload");
      save("cert-emblem", "upload");
    },
    onLogoFile(file: File | undefined) {
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
    },
  };

  const renderOpts: CertRenderOptions = {
    themeId,
    flagColors,
    emblem: emblemSel === "none" || emblemSel === "upload" ? null : emblemSel,
    logoImage: emblemSel === "upload" ? logoImg : null,
  };
  return { ctl, renderOpts };
}

export type CertStyleCtl = ReturnType<typeof useCertStyle>["ctl"];

/** معاينة مصغّرة لنموذج إطار بعيّنة فارغة. */
function ThemeThumb({
  id,
  name,
  selected,
  fonts,
  flagColors,
  onPick,
}: {
  id: CertThemeId;
  name: string;
  selected: boolean;
  fonts: CertFonts | null;
  flagColors: [string, string, string];
  onPick: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const colorsKey = flagColors.join("");
  useEffect(() => {
    const c = ref.current;
    if (!c || !fonts) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.scale(c.width / CERT_W, c.height / CERT_H);
    drawGeneralCertificate(ctx, SAMPLE_GENERAL, fonts, { themeId: id, flagColors });
    ctx.restore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fonts, id, colorsKey]);
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      className={`overflow-hidden rounded-xl border-2 bg-surface text-center transition ${
        selected ? "border-primary shadow-card" : "border-line hover:border-primary/50"
      }`}
    >
      <canvas ref={ref} width={280} height={198} className="block h-auto w-full" aria-hidden />
      <span className={`block px-2 py-1.5 text-xs font-medium ${selected ? "text-primary-dark" : "text-ink/70"}`}>
        {name}
      </span>
    </button>
  );
}

export default function CertStylePicker({ ctl }: { ctl: CertStyleCtl }) {
  const [fonts, setFonts] = useState<CertFonts | null>(null);
  useEffect(() => {
    let alive = true;
    void loadCertFonts().then((f) => alive && setFonts(f));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium">اختر نموذج الإطار</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {CERT_THEMES.map((t) => (
            <ThemeThumb
              key={t.id}
              id={t.id}
              name={t.name}
              selected={ctl.themeId === t.id}
              fonts={fonts}
              flagColors={ctl.flagColors}
              onPick={() => ctl.pickTheme(t.id)}
            />
          ))}
        </div>
      </div>

      {ctl.themeId === "flag" && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-3 text-sm">
          <span className="font-medium">ألوان العلم (من الخارج إلى الداخل):</span>
          {([0, 1, 2] as const).map((i) => (
            <label key={i} className="flex items-center gap-1.5">
              <input
                type="color"
                value={ctl.flagColors[i]}
                onChange={(e) => ctl.setFlag(i, e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border border-line bg-transparent"
                aria-label={`لون الشريط ${i + 1}`}
              />
              <span className="text-ink/60">{i + 1}</span>
            </label>
          ))}
          <button
            type="button"
            onClick={ctl.resetFlag}
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
              onClick={() => ctl.pickEmblem(e.id)}
              aria-pressed={ctl.emblemSel === e.id}
              className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                ctl.emblemSel === e.id
                  ? "border-primary bg-primary-light text-primary-dark"
                  : "border-line hover:bg-ink/5"
              }`}
            >
              {e.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => ctl.fileRef.current?.click()}
            aria-pressed={ctl.emblemSel === "upload"}
            className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
              ctl.emblemSel === "upload"
                ? "border-primary bg-primary-light text-primary-dark"
                : "border-dashed border-primary text-primary hover:bg-primary-light"
            }`}
          >
            {ctl.logoImg ? "تغيير صورة الشعار" : "＋ رفع شعارك"}
          </button>
          {ctl.logoImg && ctl.emblemSel !== "upload" && (
            <button
              type="button"
              onClick={ctl.useUpload}
              className="rounded-xl border border-line px-3 py-2 text-sm hover:bg-ink/5"
            >
              استعمال شعاري المرفوع
            </button>
          )}
          <input
            ref={ctl.fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => ctl.onLogoFile(e.target.files?.[0])}
          />
        </div>
        {ctl.logoError && <p className="mt-1 text-sm text-red-700">{ctl.logoError}</p>}
        <p className="mt-1 text-xs text-ink/50">
          الصورة تبقى في متصفّحك فقط ولا تُرفَع للمنصّة. يُفضَّل شعار بخلفية شفّافة.
        </p>
      </div>
    </div>
  );
}
