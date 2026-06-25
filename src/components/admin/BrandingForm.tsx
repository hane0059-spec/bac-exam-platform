"use client";
// src/components/admin/BrandingForm.tsx
// المدير العام: التحكّم الكامل بهوية المنصّة وصفحة الدخول.
import { useState } from "react";
import { useRouter } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import {
  QUOTE_SIZE_CLASS,
  type Branding,
  type QuoteSize,
} from "@/lib/brandingShared";

const QUOTE_SIZES: { key: QuoteSize; label: string }[] = [
  { key: "sm", label: "صغير" },
  { key: "md", label: "متوسّط" },
  { key: "lg", label: "كبير" },
  { key: "xl", label: "كبير جداً" },
];

// مفتاح تبديل بسيط.
function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3 transition hover:bg-ink/5">
      <input
        type="checkbox"
        className="mt-1"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="font-medium">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-ink/50">{hint}</span>}
      </span>
    </label>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-line pt-5">
      <h3 className="mb-3 font-display font-semibold">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export default function BrandingForm({ current }: { current: Branding }) {
  const router = useRouter();
  const [b, setB] = useState<Branding>(current);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  // الشعار يُرفع فوراً عبر مساره الخاصّ (multipart).
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoVer, setLogoVer] = useState(0); // كسر التخزين المؤقّت بعد التغيير

  function set<K extends keyof Branding>(key: K, value: Branding[K]) {
    setB((prev) => ({ ...prev, [key]: value }));
    setDone(false);
  }

  async function save() {
    setError("");
    setDone(false);
    setBusy(true);
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branding: b }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "تعذّر الحفظ.");
      return;
    }
    setDone(true);
    router.refresh();
  }

  async function uploadLogo(file: File) {
    setError("");
    setLogoBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/branding/logo", {
      method: "POST",
      body: fd,
    });
    setLogoBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "تعذّر رفع الشعار.");
      return;
    }
    set("hasLogo", true);
    setLogoVer((v) => v + 1);
    router.refresh();
  }

  async function deleteLogo() {
    setError("");
    setLogoBusy(true);
    const res = await fetch("/api/admin/branding/logo", { method: "DELETE" });
    setLogoBusy(false);
    if (!res.ok) {
      setError("تعذّر حذف الشعار.");
      return;
    }
    set("hasLogo", false);
    setLogoVer((v) => v + 1);
    router.refresh();
  }

  return (
    <div className="card max-w-2xl space-y-5 p-5">
      <div>
        <h3 className="mb-1 font-display font-semibold">هوية المنصّة وصفحة الدخول</h3>
        <p className="text-sm text-ink/60">
          كلّ ما يظهر للزائر في صفحة الدخول. التغييرات تُطبَّق فور الحفظ على
          جميع المستخدمين.
        </p>
      </div>

      {/* الاسم والشعار */}
      <Section title="الاسم والشعار">
        <div>
          <label className="mb-1.5 block text-sm font-medium">اسم المنصّة</label>
          <input
            className="field"
            value={b.name}
            maxLength={60}
            onChange={(e) => set("name", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">الشعار النصّي (tagline)</label>
          <input
            className="field"
            value={b.tagline}
            maxLength={120}
            placeholder="منصة التقييم والتمكّن"
            onChange={(e) => set("tagline", e.target.value)}
          />
        </div>
        <Toggle
          checked={b.showTagline}
          onChange={(v) => set("showTagline", v)}
          label="إظهار الشعار النصّي تحت الاسم"
        />

        <div className="rounded-xl border border-line p-3">
          <div className="mb-3 flex items-center gap-3">
            <BrandLogo size={48} hasLogo={b.hasLogo} key={`logo-${logoVer}`} />
            <div className="text-sm">
              <p className="font-medium">صورة الشعار (الأيقونة)</p>
              <p className="text-xs text-ink/50">
                PNG/JPEG/WebP ≤ 1 ميغابايت. بدونها يُعرض رمز حلزون الدنا الافتراضي.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="cursor-pointer rounded-xl border border-line px-3 py-2 text-sm font-medium transition hover:bg-ink/5">
              {logoBusy ? "جارٍ…" : b.hasLogo ? "تغيير الشعار" : "رفع شعار"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                disabled={logoBusy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadLogo(f);
                  e.target.value = "";
                }}
              />
            </label>
            {b.hasLogo && (
              <button
                type="button"
                onClick={deleteLogo}
                disabled={logoBusy}
                className="rounded-xl border border-line px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                حذف الشعار
              </button>
            )}
          </div>
        </div>
      </Section>

      {/* الحكمة */}
      <Section title="الحكمة في أسفل الصفحة">
        <div>
          <label className="mb-1.5 block text-sm font-medium">نصّ الحكمة</label>
          <input
            className="field"
            value={b.quote}
            maxLength={200}
            placeholder="التعب مؤقت والنجاح دائم"
            onChange={(e) => set("quote", e.target.value)}
          />
        </div>
        <Toggle
          checked={b.showQuote}
          onChange={(v) => set("showQuote", v)}
          label="إظهار الحكمة"
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium">حجم الحكمة</label>
          <div className="flex flex-wrap gap-2">
            {QUOTE_SIZES.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => set("quoteSize", s.key)}
                className={`rounded-xl border px-3 py-2 text-sm transition ${
                  b.quoteSize === s.key
                    ? "border-primary bg-primary-light font-medium"
                    : "border-line hover:bg-ink/5"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          {b.showQuote && b.quote && (
            <p
              className={`mt-3 text-center leading-loose text-ink/75 ${QUOTE_SIZE_CLASS[b.quoteSize]}`}
              style={{ fontFamily: "var(--font-amiri)" }}
            >
              {b.quote}
            </p>
          )}
        </div>
      </Section>

      {/* الملاحظة العامّة */}
      <Section title="ملاحظة/إعلان عامّ">
        <p className="text-xs text-ink/50">
          شريط يظهر أعلى صفحة الدخول وكل اللوحات (مثل إعلان أو تنبيه). اتركه فارغاً
          لإخفائه.
        </p>
        <textarea
          className="field min-h-[64px]"
          value={b.notice}
          maxLength={300}
          placeholder="مثال: ستُجرى صيانة يوم الجمعة من 10 إلى 12 مساءً."
          onChange={(e) => set("notice", e.target.value)}
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium">نوع الملاحظة</label>
          <div className="flex gap-2">
            {(
              [
                { key: "info", label: "معلومة (ذهبي)" },
                { key: "warning", label: "تحذير (كهرماني)" },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => set("noticeType", t.key)}
                className={`rounded-xl border px-3 py-2 text-sm transition ${
                  b.noticeType === t.key
                    ? "border-primary bg-primary-light font-medium"
                    : "border-line hover:bg-ink/5"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* وضع الصيانة */}
      <Section title="وضع الصيانة">
        <Toggle
          checked={b.maintenance}
          onChange={(v) => set("maintenance", v)}
          label="تفعيل وضع الصيانة (يوقف تسجيل الدخول)"
          hint="عند التفعيل يُمنع دخول جميع المستخدمين عدا المدير العام، مع عرض رسالة الصيانة."
        />
        <textarea
          className="field min-h-[64px]"
          value={b.maintenanceMessage}
          maxLength={300}
          placeholder="المنصّة متوقّفة مؤقّتاً للصيانة…"
          onChange={(e) => set("maintenanceMessage", e.target.value)}
        />
      </Section>

      {/* التواصل وعن المنصّة */}
      <Section title="التواصل وعن المنصّة">
        <div>
          <label className="mb-1.5 block text-sm font-medium">البريد للتواصل</label>
          <input
            className="field"
            type="email"
            dir="ltr"
            value={b.contactEmail}
            maxLength={120}
            placeholder="support@example.com"
            onChange={(e) => set("contactEmail", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">هاتف التواصل</label>
          <input
            className="field"
            type="tel"
            dir="ltr"
            value={b.contactPhone}
            maxLength={60}
            placeholder="+963 9xx xxx xxx"
            onChange={(e) => set("contactPhone", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            عن المنصّة (الأهداف ومن يديرها)
          </label>
          <textarea
            className="field min-h-[96px]"
            value={b.about}
            maxLength={1000}
            placeholder="نبذة عن أهداف المنصّة والجهة المشرفة عليها…"
            onChange={(e) => set("about", e.target.value)}
          />
        </div>
      </Section>

      {/* نوافذ الدخول */}
      <Section title="نوافذ الدخول الظاهرة">
        <p className="text-xs text-ink/50">
          أخفِ نوافذ لا تحتاجها (مثل أولياء الأمور أو المدراء). أبقِ نافذة واحدة
          على الأقلّ.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Toggle
            checked={b.showStudentLogin}
            onChange={(v) => set("showStudentLogin", v)}
            label="🎓 نافذة الطلاب"
          />
          <Toggle
            checked={b.showTeacherLogin}
            onChange={(v) => set("showTeacherLogin", v)}
            label="🧑‍🏫 نافذة المدرّسين"
          />
          <Toggle
            checked={b.showAdminLogin}
            onChange={(v) => set("showAdminLogin", v)}
            label="🛡️ نافذة المدراء"
          />
          <Toggle
            checked={b.showParentLogin}
            onChange={(v) => set("showParentLogin", v)}
            label="👪 نافذة أولياء الأمور"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">تخطيط النوافذ</label>
          <div className="flex gap-2">
            {(
              [
                { key: "grid", label: "شبكة (عمودان)" },
                { key: "list", label: "قائمة (عمود واحد)" },
              ] as const
            ).map((l) => (
              <button
                key={l.key}
                type="button"
                onClick={() => set("windowsLayout", l.key)}
                className={`rounded-xl border px-3 py-2 text-sm transition ${
                  b.windowsLayout === l.key
                    ? "border-primary bg-primary-light font-medium"
                    : "border-line hover:bg-ink/5"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {done && <p className="text-sm text-primary-dark">تمّ الحفظ ✓</p>}

      <div className="flex items-center gap-3 border-t border-line pt-4">
        <button onClick={save} disabled={busy} className="btn-primary">
          {busy ? "جارٍ الحفظ…" : "حفظ هوية المنصّة"}
        </button>
        <a
          href="/login"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline"
        >
          معاينة صفحة الدخول ↗
        </a>
      </div>
    </div>
  );
}
