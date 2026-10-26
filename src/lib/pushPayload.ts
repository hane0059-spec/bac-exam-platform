// src/lib/pushPayload.ts
// دوال نقيّة لإشعارات الدفع (آمنة للعميل والخادم): الرابط الآمن، نصّ الإشعار العام، وتحويل مفتاح VAPID.

/** نصّ عام عمداً: الإشعار يظهر على شاشة القفل، فلا اسم طالب ولا درجة (خصوصية القُصّر). */
export const GENERIC_PUSH_BODY = "لديك إشعار جديد — اضغط للعرض";

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
