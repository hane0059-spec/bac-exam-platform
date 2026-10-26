// src/lib/pushClient.ts
// مساعدات عميل لربط جهاز المتصفّح بحساب الدخول الحالي (إشعارات الدفع). للمتصفّح فقط.
// المبدأ: الجهاز يستقبل إشعارات الحساب المسجَّل دخوله حالياً فقط —
//  • عند الخروج يُفصَل الجهاز عن الحساب (يبقى اشتراك المتصفّح نفسه).
//  • عند الدخول بحساب آخر يُربَط الجهاز به تلقائياً إن كان المستخدم قد فعّل الإشعارات على هذا الجهاز.

const FLAG = "push-synced";

async function currentSubscription(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  return (await reg?.pushManager.getSubscription()) ?? null;
}

/** يفصل هذا الجهاز عن الحساب الحالي في الخادم (قبل تسجيل الخروج). لا يرمي. */
export async function detachThisDevice(): Promise<void> {
  try {
    sessionStorage.removeItem(FLAG);
    const sub = await currentSubscription();
    if (!sub) return;
    await Promise.race([
      fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      }),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch {
    // الخروج لا يجب أن يتعطّل بسبب الدفع.
  }
}

/** يربط هذا الجهاز بالحساب الحالي إن كانت الإشعارات مفعّلة في المتصفّح (مرّة لكل جلسة تبويب). لا يرمي. */
export async function syncThisDevice(): Promise<void> {
  try {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    if (sessionStorage.getItem(FLAG)) return;
    const sub = await currentSubscription();
    if (!sub) return;
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub.toJSON()),
    });
    // 401 = لا جلسة (صفحة الدخول/الرئيسية): نحاول لاحقاً بعد الدخول.
    if (res.ok) sessionStorage.setItem(FLAG, "1");
    else if (res.status === 401) sessionStorage.removeItem(FLAG); // لا جلسة: ربطٌ جديد بعد الدخول التالي
  } catch {
    // best-effort.
  }
}
