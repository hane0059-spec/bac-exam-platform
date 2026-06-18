"use client";
// src/components/admin/AcademicsTree.tsx
// المدير: شجرة متداخلة «الصفّ ← مواده» مع تحرير/حذف لكل عنصر.
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

export default function AcademicsTree({
  grades,
  subjects,
  gradeOptions,
}: {
  grades: Grade[];
  subjects: Subject[];
  gradeOptions: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState<Record<string, boolean>>({});
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
      return;
    }
    setEditGrade(null);
    setEditSubject(null);
    router.refresh();
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

  const byGrade = (gid: string) =>
    subjects.filter((s) => s.gradeLevelId === gid);
  // مواد بلا صفّ مطابق (نادر) — تُعرض تحت مجموعة منفصلة.
  const orphanSubjects = subjects.filter(
    (s) => !grades.some((g) => g.id === s.gradeLevelId),
  );

  return (
    <div className="space-y-2">
      {grades.map((g) => {
        const subs = byGrade(g.id);
        const isOpen = open[g.id] ?? false;
        return (
          <div key={g.id}>
            {editGrade?.id === g.id ? (
              <GradeEditForm
                value={editGrade}
                busy={busy}
                onChange={setEditGrade}
                onCancel={() => setEditGrade(null)}
                onSave={() =>
                  save(`/api/admin/grades/${g.id}`, {
                    name: editGrade.name,
                    code: editGrade.code,
                    orderNum: editGrade.orderNum,
                  })
                }
              />
            ) : (
              <div className="flex items-center justify-between gap-2 rounded-lg bg-ink/5 px-3 py-2">
                <button
                  onClick={() =>
                    setOpen((o) => ({ ...o, [g.id]: !isOpen }))
                  }
                  className="flex flex-1 items-center gap-2 text-right font-medium"
                >
                  <span className="text-xs text-ink/40">
                    {isOpen ? "▾" : "◂"}
                  </span>
                  {g.name}
                  <span className="text-xs text-ink/40" dir="ltr">
                    ({g.code})
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs text-ink/50">
                    {subs.length} مادة
                  </span>
                </button>
                <span className="flex items-center gap-3 text-sm">
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
            )}

            {isOpen && (
              <div
                className="mt-1.5 space-y-1.5"
                style={{ paddingInlineStart: 14 }}
              >
                {subs.length === 0 ? (
                  <p className="px-3 py-1 text-xs text-ink/40">
                    لا مواد في هذا الصفّ.
                  </p>
                ) : (
                  subs.map((s) =>
                    editSubject?.id === s.id ? (
                      <SubjectEditForm
                        key={s.id}
                        value={editSubject}
                        gradeOptions={gradeOptions}
                        busy={busy}
                        onChange={setEditSubject}
                        onCancel={() => setEditSubject(null)}
                        onSave={() =>
                          save(`/api/admin/subjects/${s.id}`, {
                            name: editSubject.name,
                            code: editSubject.code,
                            gradeLevelId: editSubject.gradeLevelId,
                            color: editSubject.color,
                          })
                        }
                      />
                    ) : (
                      <SubjectRow
                        key={s.id}
                        subject={s}
                        onEdit={() => setEditSubject(s)}
                        onDelete={() =>
                          del(
                            `/api/admin/subjects/${s.id}`,
                            `حذف المادة «${s.name}»؟`,
                          )
                        }
                      />
                    ),
                  )
                )}
              </div>
            )}
          </div>
        );
      })}

      {orphanSubjects.length > 0 && (
        <div>
          <div className="rounded-lg bg-ink/5 px-3 py-2 font-medium">
            مواد بلا صفّ
          </div>
          <div className="mt-1.5 space-y-1.5" style={{ paddingInlineStart: 14 }}>
            {orphanSubjects.map((s) =>
              editSubject?.id === s.id ? (
                <SubjectEditForm
                  key={s.id}
                  value={editSubject}
                  gradeOptions={gradeOptions}
                  busy={busy}
                  onChange={setEditSubject}
                  onCancel={() => setEditSubject(null)}
                  onSave={() =>
                    save(`/api/admin/subjects/${s.id}`, {
                      name: editSubject.name,
                      code: editSubject.code,
                      gradeLevelId: editSubject.gradeLevelId,
                      color: editSubject.color,
                    })
                  }
                />
              ) : (
                <SubjectRow
                  key={s.id}
                  subject={s}
                  onEdit={() => setEditSubject(s)}
                  onDelete={() =>
                    del(
                      `/api/admin/subjects/${s.id}`,
                      `حذف المادة «${s.name}»؟`,
                    )
                  }
                />
              ),
            )}
          </div>
        </div>
      )}

      {grades.length === 0 && orphanSubjects.length === 0 && (
        <div className="card p-8 text-center text-ink/60">لا صفوف بعد.</div>
      )}

      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

function SubjectRow({
  subject: s,
  onEdit,
  onDelete,
}: {
  subject: Subject;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="card flex items-center justify-between gap-2 px-3 py-2 text-sm">
      <span className="flex items-center gap-2">
        {s.color && (
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: s.color }}
          />
        )}
        {s.name}
        <span className="text-ink/40" dir="ltr">
          ({s.code})
        </span>
      </span>
      <span className="flex items-center gap-3">
        <span className="text-ink/50">{s.teachersCount} مدرّس</span>
        <button onClick={onEdit} className="text-primary hover:underline">
          تعديل
        </button>
        <button onClick={onDelete} className="text-red-500 hover:underline">
          حذف
        </button>
      </span>
    </div>
  );
}

function GradeEditForm({
  value,
  busy,
  onChange,
  onCancel,
  onSave,
}: {
  value: Grade;
  busy: boolean;
  onChange: (g: Grade) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-primary p-3">
      <input
        className="field"
        value={value.name}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
      />
      <input
        className="field"
        dir="ltr"
        value={value.code}
        onChange={(e) => onChange({ ...value, code: e.target.value })}
      />
      <input
        type="number"
        className="field"
        value={value.orderNum}
        onChange={(e) => onChange({ ...value, orderNum: Number(e.target.value) })}
      />
      <div className="flex gap-2">
        <button
          disabled={busy}
          onClick={onSave}
          className="btn-primary px-4 py-1.5 text-sm"
        >
          حفظ
        </button>
        <button onClick={onCancel} className="text-sm text-ink/60 hover:underline">
          إلغاء
        </button>
      </div>
    </div>
  );
}

function SubjectEditForm({
  value,
  gradeOptions,
  busy,
  onChange,
  onCancel,
  onSave,
}: {
  value: Subject;
  gradeOptions: { id: string; name: string }[];
  busy: boolean;
  onChange: (s: Subject) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-primary p-3">
      <input
        className="field"
        value={value.name}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
      />
      <input
        className="field"
        dir="ltr"
        value={value.code}
        onChange={(e) => onChange({ ...value, code: e.target.value })}
      />
      <select
        className="field"
        value={value.gradeLevelId}
        onChange={(e) => onChange({ ...value, gradeLevelId: e.target.value })}
      >
        {gradeOptions.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>
      <input
        type="color"
        value={value.color || "#1F7A63"}
        onChange={(e) => onChange({ ...value, color: e.target.value })}
        className="h-9 w-12 rounded border border-line"
      />
      <div className="flex gap-2">
        <button
          disabled={busy}
          onClick={onSave}
          className="btn-primary px-4 py-1.5 text-sm"
        >
          حفظ
        </button>
        <button onClick={onCancel} className="text-sm text-ink/60 hover:underline">
          إلغاء
        </button>
      </div>
    </div>
  );
}
