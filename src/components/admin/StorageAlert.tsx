// src/components/admin/StorageAlert.tsx
// تنبيه حجم قاعدة البيانات للمدير العام: يظهر فقط عند الاقتراب من حدّ الخطة (≥70%).
import Link from "next/link";
import type { DbStorage } from "@/lib/dbStorage";

function mb(n: number) {
  return `${Math.round(n / (1024 * 1024))} م.ب`;
}

export default function StorageAlert({ s, link = false }: { s: DbStorage; link?: boolean }) {
  if (s.level === "ok") return null;
  const critical = s.level === "critical";
  return (
    <div
      role="alert"
      className={`mb-5 rounded-xl border px-4 py-3 text-sm leading-relaxed ${
        critical
          ? "border-red-300 bg-red-100 text-red-900"
          : "border-amber-300 bg-amber-100 text-amber-900"
      }`}
    >
      <p className="font-bold">
        {critical ? "⛔ التخزين على وشك النفاد" : "⚠️ التخزين يقترب من حدّ الخطة"}
        {" — "}
        استُهلك {s.percent}% ({mb(s.usedBytes)} من {mb(s.limitBytes)})
      </p>
      <p className="mt-1">
        {critical
          ? "عند بلوغ الحدّ تتوقّف كتابة البيانات (إجابات الطلاب والرفع). احذف الملفّات الكبيرة أو رقِّ الخطة فوراً."
          : "الملفّات المرفوعة تُخزَّن داخل القاعدة؛ تجنّب رفع ملفّات كبيرة جديدة وفكّر بترقية الخطة قبل بلوغ الحدّ."}
        {link && (
          <>
            {" "}
            <Link href="/admin/storage" className="font-semibold underline">
              تفاصيل التخزين
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
