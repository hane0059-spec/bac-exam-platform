// src/lib/brandingShared.ts
// أنواع وثوابت هوية المنصّة — آمنة للعميل (لا prisma ولا cache).
// تستوردها مكوّنات العميل؛ ودوال قاعدة البيانات في branding.ts (خادم فقط).

export type QuoteSize = "sm" | "md" | "lg" | "xl";
export type NoticeType = "info" | "warning";
export type WindowsLayout = "grid" | "list";

export interface Branding {
  // الاسم والهوية
  name: string;
  tagline: string;
  showTagline: boolean;
  hasLogo: boolean; // هل رُفعت صورة شعار مخصّصة؟

  // الحكمة في أسفل صفحة الدخول
  quote: string;
  showQuote: boolean;
  quoteSize: QuoteSize;

  // ملاحظة/إعلان عامّ (بانر) — يظهر في الدخول واللوحات
  notice: string;
  noticeType: NoticeType;

  // وضع الصيانة — يوقف تسجيل الدخول فعلياً (عدا المدير العام)
  maintenance: boolean;
  maintenanceMessage: string;

  // معلومات التواصل و«عن المنصّة» (تظهر في تذييل صفحة الدخول)
  contactEmail: string;
  contactPhone: string;
  about: string;

  // إظهار/إخفاء نوافذ الدخول حسب الدور
  showStudentLogin: boolean;
  showTeacherLogin: boolean;
  showAdminLogin: boolean;
  showParentLogin: boolean;

  // تخطيط نوافذ الدخول: شبكة عمودين أو قائمة عمود واحد
  windowsLayout: WindowsLayout;
}

export const DEFAULT_BRANDING: Branding = {
  name: "إتقان",
  tagline: "منصة التقييم والتمكّن",
  showTagline: true,
  hasLogo: false,

  quote: "التعب مؤقت والنجاح دائم",
  showQuote: true,
  quoteSize: "lg",

  notice: "",
  noticeType: "info",

  maintenance: false,
  maintenanceMessage:
    "المنصّة متوقّفة مؤقّتاً للصيانة. نعتذر عن الإزعاج وسنعود قريباً.",

  contactEmail: "",
  contactPhone: "",
  about: "",

  showStudentLogin: true,
  showTeacherLogin: true,
  showAdminLogin: true,
  showParentLogin: true,

  windowsLayout: "grid",
};

// خريطة حجم الحكمة إلى صنف Tailwind.
export const QUOTE_SIZE_CLASS: Record<QuoteSize, string> = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-2xl",
  xl: "text-3xl",
};

/** يدمج قيمة محفوظة (قد تكون ناقصة) فوق الافتراضات بأمان أنواع. نقيّة. */
export function mergeBranding(raw: unknown): Branding {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_BRANDING };
  const r = raw as Record<string, unknown>;
  const merged: Branding = { ...DEFAULT_BRANDING };
  for (const key of Object.keys(DEFAULT_BRANDING) as (keyof Branding)[]) {
    const v = r[key];
    if (v === undefined || v === null) continue;
    // النوع نفسه فقط (نصوص/منطقيات)؛ أيّ شذوذ يُتجاهَل للقيمة الافتراضية.
    if (typeof v === typeof DEFAULT_BRANDING[key]) {
      // @ts-expect-error دمج ديناميكي متجانس الأنواع.
      merged[key] = v;
    }
  }
  // ضبط القيم المحصورة.
  if (!["sm", "md", "lg", "xl"].includes(merged.quoteSize))
    merged.quoteSize = DEFAULT_BRANDING.quoteSize;
  if (!["info", "warning"].includes(merged.noticeType))
    merged.noticeType = DEFAULT_BRANDING.noticeType;
  if (!["grid", "list"].includes(merged.windowsLayout))
    merged.windowsLayout = DEFAULT_BRANDING.windowsLayout;
  return merged;
}
