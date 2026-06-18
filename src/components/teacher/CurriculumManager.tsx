"use client";
// src/components/teacher/CurriculumManager.tsx
// إدارة بنية المنهج: المادة ← وحدة ← فصل ← درس.
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Lesson {
  id: string;
  title: string;
}
interface Chapter {
  id: string;
  title: string;
  lessons: Lesson[];
}
interface Unit {
  id: string;
  title: string;
  chapters: Chapter[];
}
export interface CurriculumSubject {
  id: string;
  name: string;
  units: Unit[];
}

export default function CurriculumManager({
  subjects,
}: {
  subjects: CurriculumSubject[];
}) {
  const router = useRouter();
  const [activeId, setActiveId] = useState(subjects[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const active = subjects.find((s) => s.id === activeId);

  async function api(body: Record<string, unknown>) {
    setBusy(true);
    const res = await fetch("/api/teacher/curriculum", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error ?? "تعذّر تنفيذ العملية.");
      return;
    }
    router.refresh();
  }

  function add(type: string, parentKey: string, parentId: string, label: string) {
    const title = prompt(`اسم ${label}`)?.trim();
    if (title) api({ action: "create", type, [parentKey]: parentId, title });
  }
  function rename(type: string, id: string, current: string) {
    const title = prompt("الاسم الجديد", current)?.trim();
    if (title && title !== current) api({ action: "update", type, id, title });
  }
  function del(type: string, id: string, what: string) {
    if (confirm(`حذف ${what}؟`)) api({ action: "delete", type, id });
  }

  if (subjects.length === 0) {
    return (
      <div className="card p-8 text-center text-ink/60">
        لا توجد مواد مسنَدة إليك بعد.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {subjects.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {subjects.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveId(s.id)}
              className={`rounded-full px-3 py-1 text-sm ${
                activeId === s.id
                  ? "bg-primary text-white"
                  : "bg-ink/5 text-ink/70 hover:bg-primary-light"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {active && (
        <div className="card space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold">وحدات «{active.name}»</h3>
            <button
              disabled={busy}
              onClick={() => add("unit", "subjectId", active.id, "الوحدة")}
              className="text-sm text-primary hover:underline"
            >
              + وحدة
            </button>
          </div>

          {active.units.length === 0 ? (
            <p className="text-sm text-ink/50">لا وحدات بعد.</p>
          ) : (
            <div className="space-y-3">
              {active.units.map((u) => (
                <div key={u.id} className="rounded-xl border border-line p-3">
                  <Row
                    title={u.title}
                    bold
                    onRename={() => rename("unit", u.id, u.title)}
                    onDelete={() => del("unit", u.id, `الوحدة «${u.title}»`)}
                    onAdd={() => add("chapter", "unitId", u.id, "الفصل")}
                    addLabel="+ فصل"
                    busy={busy}
                  />
                  <div className="mt-2 space-y-2 pr-4">
                    {u.chapters.map((c) => (
                      <div key={c.id} className="rounded-lg bg-ink/5 p-2">
                        <Row
                          title={c.title}
                          onRename={() => rename("chapter", c.id, c.title)}
                          onDelete={() =>
                            del("chapter", c.id, `الفصل «${c.title}»`)
                          }
                          onAdd={() => add("lesson", "chapterId", c.id, "الدرس")}
                          addLabel="+ درس"
                          busy={busy}
                        />
                        <ul className="mt-1 space-y-1 pr-4">
                          {c.lessons.map((l) => (
                            <li key={l.id}>
                              <Row
                                title={`• ${l.title}`}
                                small
                                onRename={() => rename("lesson", l.id, l.title)}
                                onDelete={() =>
                                  del("lesson", l.id, `الدرس «${l.title}»`)
                                }
                                busy={busy}
                              />
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({
  title,
  bold,
  small,
  onRename,
  onDelete,
  onAdd,
  addLabel,
  busy,
}: {
  title: string;
  bold?: boolean;
  small?: boolean;
  onRename: () => void;
  onDelete: () => void;
  onAdd?: () => void;
  addLabel?: string;
  busy: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={`${bold ? "font-semibold" : ""} ${small ? "text-sm text-ink/70" : ""}`}>
        {title}
      </span>
      <span className="flex shrink-0 items-center gap-2 text-xs">
        {onAdd && (
          <button
            disabled={busy}
            onClick={onAdd}
            className="text-primary hover:underline"
          >
            {addLabel}
          </button>
        )}
        <button onClick={onRename} className="text-ink/50 hover:underline">
          تعديل
        </button>
        <button onClick={onDelete} className="text-red-500 hover:underline">
          حذف
        </button>
      </span>
    </div>
  );
}
