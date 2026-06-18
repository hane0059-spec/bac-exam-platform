"use client";
// src/components/admin/AcademicsLists.tsx
// المدير: قوائم الصفوف والمواد مع تحرير/حذف لكل عنصر.
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Grade {
  id: string;
  name: string;
  code: string;
  orderNum: number;
  subjectsCount: number;
}
interface Subject {
  id: string;
  name: string;
  code: string;
  gradeLevelId: string;
  gradeName: string;
  color: string;
  teachersCount: number;
}

export default function AcademicsLists({
  grades,
  subjects,
  gradeOptions,
}: {
  grades: Grade[];
  subjects: Subject[];
  gradeOptions: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [editGrade, setEditGrade] = useState<Grade | null>(null);
  const [editSubject, setEditSubject] = useState<Subject | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(url: string, body: unknown) {
    setError("");
    setBusy(true);
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "تعذّر الحفظ.");
      return false;
    }
    setEditGrade(null);
    setEditSubject(null);
    router.refresh();
    return true;
  }

  async function del(url: string, confirmMsg: string) {
    if (!confirm(confirmMsg)) return;
    setError("");
    setBusy(true);
    const res = await fetch(url, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "تعذّر الحذف.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* الصفوف */}
      <div className="card p-5">
        <h3 className="mb-3 font-display font-semibold">الصفوف ({grades.length})</h3>
        <div className="space-y-2">
          {grades.map((g) =>
            editGrade?.id === g.id ? (
              <div key={g.id} className="space-y-2 rounded-xl border border-primary p-3">
                <input
                  className="field"
                  value={editGrade.name}
                  onChange={(e) =>
                    setEditGrade({ ...editGrade, name: e.target.value })
                  }
                />
                <input
                  className="field"
                  dir="ltr"
                  value={editGrade.code}
                  onChange={(e) =>
                    setEditGrade({ ...editGrade, code: e.target.value })
                  }
                />
                <input
                  type="number"
                  className="field"
                  value={editGrade.orderNum}
                  onChange={(e) =>
                    setEditGrade({
                      ...editGrade,
                      orderNum: Number(e.target.value),
                    })
                  }
                />
                <div className="flex gap-2">
                  <button
                    disabled={busy}
                    onClick={() =>
                      save(`/api/admin/grades/${g.id}`, {
                        name: editGrade.name,
                        code: editGrade.code,
                        orderNum: editGrade.orderNum,
                      })
                    }
                    className="btn-primary px-4 py-1.5 text-sm"
                  >
                    حفظ
                  </button>
                  <button
                    onClick={() => setEditGrade(null)}
                    className="text-sm text-ink/60 hover:underline"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            ) : (
              <div
                key={g.id}
                className="flex items-center justify-between rounded-lg bg-ink/5 px-3 py-1.5 text-sm"
              >
                <span>
                  {g.name}{" "}
                  <span className="text-ink/40" dir="ltr">
                    ({g.code})
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-ink/50">{g.subjectsCount} مادة</span>
                  <button
                    onClick={() => setEditGrade(g)}
                    className="text-primary hover:underline"
                  >
                    تعديل
                  </button>
                  <button
                    onClick={() =>
                      del(`/api/admin/grades/${g.id}`, `حذف الصفّ «${g.name}»؟`)
                    }
                    className="text-red-500 hover:underline"
                  >
                    حذف
                  </button>
                </span>
              </div>
            )
          )}
        </div>
      </div>

      {/* المواد */}
      <div className="card p-5">
        <h3 className="mb-3 font-display font-semibold">المواد ({subjects.length})</h3>
        <div className="space-y-2">
          {subjects.map((s) =>
            editSubject?.id === s.id ? (
              <div key={s.id} className="space-y-2 rounded-xl border border-primary p-3">
                <input
                  className="field"
                  value={editSubject.name}
                  onChange={(e) =>
                    setEditSubject({ ...editSubject, name: e.target.value })
                  }
                />
                <input
                  className="field"
                  dir="ltr"
                  value={editSubject.code}
                  onChange={(e) =>
                    setEditSubject({ ...editSubject, code: e.target.value })
                  }
                />
                <select
                  className="field"
                  value={editSubject.gradeLevelId}
                  onChange={(e) =>
                    setEditSubject({
                      ...editSubject,
                      gradeLevelId: e.target.value,
                    })
                  }
                >
                  {gradeOptions.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <input
                  type="color"
                  value={editSubject.color || "#1F7A63"}
                  onChange={(e) =>
                    setEditSubject({ ...editSubject, color: e.target.value })
                  }
                  className="h-9 w-12 rounded border border-line"
                />
                <div className="flex gap-2">
                  <button
                    disabled={busy}
                    onClick={() =>
                      save(`/api/admin/subjects/${s.id}`, {
                        name: editSubject.name,
                        code: editSubject.code,
                        gradeLevelId: editSubject.gradeLevelId,
                        color: editSubject.color,
                      })
                    }
                    className="btn-primary px-4 py-1.5 text-sm"
                  >
                    حفظ
                  </button>
                  <button
                    onClick={() => setEditSubject(null)}
                    className="text-sm text-ink/60 hover:underline"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            ) : (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg bg-ink/5 px-3 py-1.5 text-sm"
              >
                <span className="flex items-center gap-2">
                  {s.color && (
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                  )}
                  {s.name}
                  <span className="text-ink/40">• {s.gradeName}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-ink/50">{s.teachersCount} مدرّس</span>
                  <button
                    onClick={() => setEditSubject(s)}
                    className="text-primary hover:underline"
                  >
                    تعديل
                  </button>
                  <button
                    onClick={() =>
                      del(`/api/admin/subjects/${s.id}`, `حذف المادة «${s.name}»؟`)
                    }
                    className="text-red-500 hover:underline"
                  >
                    حذف
                  </button>
                </span>
              </div>
            )
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600 lg:col-span-2">
          {error}
        </p>
      )}
    </div>
  );
}
