"use client";
// src/components/admin/UserSearchBox.tsx
// بحث المدير عن مستخدم بالاسم/الرمز/البريد/الهاتف.
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UserSearchBox({ initial }: { initial: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);

  function go(e: React.FormEvent) {
    e.preventDefault();
    const v = q.trim();
    router.push(v ? `/admin/users?q=${encodeURIComponent(v)}` : "/admin/users");
  }

  return (
    <form onSubmit={go} className="mb-5 flex flex-wrap gap-2">
      <input
        className="field flex-1"
        placeholder="ابحث بالاسم أو الرمز أو البريد أو الهاتف"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <button type="submit" className="btn-primary px-5">
        بحث
      </button>
      {initial && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            router.push("/admin/users");
          }}
          className="rounded-xl border border-line px-4 py-3 text-sm font-medium hover:bg-ink/5"
        >
          مسح
        </button>
      )}
    </form>
  );
}
