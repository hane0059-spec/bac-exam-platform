"use client";
// src/components/PushToggle.tsx
// بطاقة «إشعارات الهاتف»: تثبيت التطبيق + تفعيل/إيقاف الإشعارات على هذا الجهاز + إشعار تجريبي.
import { useCallback, useEffect, useState } from "react";
import { urlBase64ToUint8Array } from "@/lib/pushPayload";

type Phase =
  | "loading"
  | "disabledByAdmin" // مفاتيح VAPID غير مضبوطة على الخادم
  | "unsupported" // المتصفّح لا يدعم الدفع
  | "ios-install" // آيفون: يلزم إضافة الموقع للشاشة الرئيسية أولاً
  | "denied" // المستخدم حظر الإشعارات من المتصفّح
  | "off"
  | "on";

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}
function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export default function PushToggle() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [installEvt, setInstallEvt] = useState<InstallEvent | null>(null);

  const detect = useCallback(async () => {
    if (isIOS() && !isStandalone() && !("PushManager" in window)) {
      setPhase("ios-install");
      return;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setPhase("unsupported");
      return;
    }
    const k = await fetch("/api/push/key").catch(() => null);
    if (!k || k.status === 404) {
      setPhase("disabledByAdmin");
      return;
    }
    if (Notification.permission === "denied") {
      setPhase("denied");
      return;
    }
    const reg = await navigator.serviceWorker.register("/sw.js").catch(() => null);
    const sub = reg ? await reg.pushManager.getSubscription().catch(() => null) : null;
    setPhase(sub && Notification.permission === "granted" ? "on" : "off");
  }, []);

  useEffect(() => {
    detect();
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, [detect]);

  async function enable() {
    setBusy(true);
    setMsg("");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setPhase(perm === "denied" ? "denied" : "off");
        return;
      }
      const keyRes = await fetch("/api/push/key");
      if (!keyRes.ok) throw new Error("key");
      const { key } = (await keyRes.json()) as { key: string };
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
        }));
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error("subscribe");
      setPhase("on");
      setMsg("تمّ التفعيل على هذا الجهاز.");
    } catch {
      setMsg("تعذّر التفعيل. جرّب مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMsg("");
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setPhase("off");
    } catch {
      setMsg("تعذّر الإيقاف.");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const j = (await res.json().catch(() => ({}))) as { sent?: number; error?: string };
      setMsg(
        res.ok
          ? j.sent
            ? "أُرسل إشعار تجريبي — يجب أن يظهر خلال ثوانٍ."
            : "لم يُرسَل لأيّ جهاز. أوقف التفعيل وأعده."
          : j.error ?? "تعذّر الإرسال."
      );
    } finally {
      setBusy(false);
    }
  }

  async function install() {
    if (!installEvt) return;
    await installEvt.prompt();
    setInstallEvt(null);
  }

  if (phase === "loading" || phase === "disabledByAdmin") return null;

  return (
    <div className="card mb-4 p-4">
      <h3 className="font-display text-base font-bold">إشعارات الهاتف</h3>

      {phase === "ios-install" && (
        <p className="mt-2 text-sm leading-relaxed text-ink/70">
          على الآيفون: افتح الموقع في سفاري، اضغط زرّ المشاركة ثم «إضافة إلى الشاشة الرئيسية»، ثم افتح التطبيق من
          أيقونته الجديدة وفعّل الإشعارات من هذه الصفحة.
        </p>
      )}
      {phase === "unsupported" && (
        <p className="mt-2 text-sm text-ink/70">هذا المتصفّح لا يدعم إشعارات الهاتف. جرّب Chrome أو Safari حديثاً.</p>
      )}
      {phase === "denied" && (
        <p className="mt-2 text-sm text-ink/70">
          حظرتَ الإشعارات لهذا الموقع. فعّلها من إعدادات المتصفّح (أيقونة القفل بجانب العنوان ← الإشعارات ← سماح)، ثم
          أعد تحميل الصفحة.
        </p>
      )}
      {phase === "off" && (
        <p className="mt-2 text-sm text-ink/70">
          فعّل الإشعارات ليصلك تنبيه على هاتفك عند وجود جديد (تصحيح، ردّ، اختبار مُسنَد) حتى لو كان الموقع مغلقاً.
        </p>
      )}
      {phase === "on" && (
        <p className="mt-2 text-sm text-primary-dark">الإشعارات مفعّلة على هذا الجهاز ✔</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {phase === "off" && (
          <button onClick={enable} disabled={busy} className="btn-primary disabled:opacity-50">
            تفعيل الإشعارات
          </button>
        )}
        {phase === "on" && (
          <>
            <button
              onClick={test}
              disabled={busy}
              className="rounded-lg bg-primary-light px-3 py-1.5 text-sm text-primary-dark hover:bg-primary hover:text-white disabled:opacity-50"
            >
              إرسال إشعار تجريبي
            </button>
            <button onClick={disable} disabled={busy} className="text-sm text-red-500 hover:underline disabled:opacity-50">
              إيقاف على هذا الجهاز
            </button>
          </>
        )}
        {installEvt && (
          <button onClick={install} className="rounded-lg border border-primary px-3 py-1.5 text-sm text-primary hover:bg-primary-light">
            ثبّت التطبيق على الشاشة الرئيسية
          </button>
        )}
      </div>
      {msg && <p className="mt-2 text-sm text-ink/70">{msg}</p>}
    </div>
  );
}
