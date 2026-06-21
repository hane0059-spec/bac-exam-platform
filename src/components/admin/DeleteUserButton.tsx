"use client";
// src/components/admin/DeleteUserButton.tsx
// حذف نهائي لحساب مستخدم من لوحة المدير — بتأكيد صريح. يعرض رسالة المنع
// (409) إن كان الحساب «يملك» محتوى، مقترحاً التعطيل بديلاً.
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteUserButton({
  userId,
  userName,
  redirectTo = "/admin/users",
}: {
  userId: string;
  userName: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setError("");
    setBusy(true);
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      setConfirming(false);
      setError(d.error ?? "تعذّر الحذف.");
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="card max-w-2xl space-y-3 border-red-200 bg-red-50/40 p-6">
      <h3 className="font-display font-semibold text-red-700">حذف الحساب</h3>
      <p className="text-sm text-ink/60">
        يحذف حساب <span className="font-medium">{userName}</span> نهائياً. لا
        يمكن حذف حساب «يملك» محتوى (طلاب/أسئلة/اختبارات) — عطّله بدل ذلك. لا
        رجعة بعد الحذف.
      </p>
      {error && (
        <p className="rounded-xl bg-red-100 p-3 text-sm text-red-700">{error}</p>
      )}
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="rounded-xl border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
        >
          حذف نهائي…
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-red-700">
            متأكّد؟ لا رجعة بعد الحذف.
          </span>
          <button
            onClick={remove}
            disabled={busy}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? "…يُحذف" : "نعم، احذف نهائياً"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={busy}
            className="rounded-xl border border-line px-4 py-2 text-sm font-medium hover:bg-ink/5"
          >
            تراجع
          </button>
        </div>
      )}
    </div>
  );
}
