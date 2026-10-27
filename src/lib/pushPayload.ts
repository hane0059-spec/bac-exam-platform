// src/lib/pushPayload.ts
// دوال نقيّة لإشعارات الدفع (آمنة للعميل والخادم): الرابط الآمن، نصّ الإشعار العام، وتحويل مفتاح VAPID.

/** نصّ عام عمداً: الإشعار يظهر على شاشة القفل، فلا اسم طالب ولا درجة (خصوصية القُصّر). */
export const GENERIC_PUSH_BODY = "لديك إشعار جديد — اضغط للعرض";

/**
 * عنوان مفيد لكل نوع إشعار داخلي — بلا أسماء ولا درجات ولا نصّ الرسالة (يظهر على شاشة القفل).
 * نوعٌ غير مذكور ← النصّ العام.
 */
export const PUSH_BODY_BY_TYPE: Record<string, string> = {
  ASSIGNED: "اختبار جديد مُسنَد إليك",
  GRADED: "تمّ تصحيح اختبارك",
  RECOMPUTED: "أُعيد حساب نتيجة اختبارك",
  session_closed: "أُنهي اختبارك وظهرت نتيجته",
  teacher_feedback: "ملاحظة جديدة من مدرّسك على نتيجتك",
  certificate_issued: "🏅 شهادة تقدير جديدة لك",
  appeal_resolved: "تمّ الردّ على اعتراضك",
  student_message_reply: "ردّ جديد من مدرّسك على رسالتك",
  parent_message_reply: "ردّ جديد من المدرّس على رسالتك",
  password_reset: "تغيّرت كلمة سرّ حسابك",
  // للمدرّس/المدير
  exam_submitted: "طالب سلّم اختباراً",
  exam_needs_grading: "تسليم جديد بانتظار تصحيحك",
  appeal_opened: "اعتراض جديد على تصحيح",
  student_message: "رسالة جديدة من طالب",
  parent_message: "رسالة جديدة من وليّ أمر",
  JOINED: "طالب انضمّ إلى اختبارك",
  REPORT: "بلاغ جديد عن سؤال",
  teacher_deletion_request: "طلب حذف حساب مدرّس بانتظار مراجعتك",
};

export function pushBodyForType(type?: string | null): string {
  return (type && PUSH_BODY_BY_TYPE[type]) || GENERIC_PUSH_BODY;
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
}

/** يقبل مساراً داخلياً فقط (يبدأ بـ«/» لا «//») وإلا يعود لصفحة الإشعارات — يمنع فتح روابط خارجية. */
export function safePushUrl(url?: string | null): string {
  if (!url) return "/notifications";
  const u = url.trim();
  if (!u.startsWith("/") || u.startsWith("//") || u.includes("\\")) return "/notifications";
  return u.slice(0, 500);
}

export function buildPushPayload(opts: {
  title: string;
  linkUrl?: string | null;
  body?: string;
}): PushPayload {
  return {
    title: opts.title.trim() || "إتقان",
    body: opts.body ?? GENERIC_PUSH_BODY,
    url: safePushUrl(opts.linkUrl),
  };
}

/** مفتاح VAPID العام (base64url) ← Uint8Array لـ`pushManager.subscribe`. */
export function urlBase64ToUint8Array(b64: string): Uint8Array {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const base = (b64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
