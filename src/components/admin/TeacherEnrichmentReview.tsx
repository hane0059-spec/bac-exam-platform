"use client";
// src/components/admin/TeacherEnrichmentReview.tsx
// المدير العام: اعتماد محتوى إثراء مدرّس على الصفحة العامّة بلا تكرار الملف (نفس
// الصفّ، فقط تبديل teacherId/sourceTeacherId عبر /api/admin/resources/[id]/publish)،
// والتراجع عن عنصر سبق اعتماده.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { kindOfMime } from "@/lib/resources";

export interface ReviewRow {
  id: string;
  title: string;
  sizeBytes: number;
  kind: string;
  body: string | null;
  mimeType: string;
  gradeName: string;
  teacherName: string;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} ب`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} ك.ب`;
  return `${(n / (1024 * 1024)).toFixed(1)} م.ب`;
}

function Row({
  item,
  actionLabel,
  confirmText,
  onDone,
}: {
  item: ReviewRow;
  actionLabel: string;
  confirmText: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act() {
    if (!confirm(confirmText)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/resources/${item.id}/publish`, {
      method: "POST",
    });
    setBusy(false);
    if (res.ok) {
      onDone();
      router.refresh();
    }
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2.5">
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex min-w-0 items-center gap-2">
          <span aria-hidden>
            {{ text: "📌", image: "🖼️", word: "📝", pdf: "📄" }[kindOfMime(item.mimeType, item.kind)]}
          </span>
          <span className="truncate text-sm font-medium">{item.title}</span>
          <span className="shrink-0 text-xs text-ink/45">{item.gradeName}</span>
          {item.kind !== "TEXT" && (
            <span className="shrink-0 text-xs text-ink/45">{formatBytes(item.sizeBytes)}</span>
          )}
        </span>
        <span className="truncate text-xs text-ink/55">المدرّس: {item.teacherName}</span>
      </span>
      <button
        type="button"
        onClick={act}
        disabled={busy}
        className="btn-primary shrink-0 px-3 py-1.5 text-sm disabled:opacity-50"
      >
        {busy ? "جارٍ التنفيذ…" : actionLabel}
      </button>
    </li>
  );
}

/** يجمع العناصر حسب المدرّس (الأسماء مرتّبة أبجدياً) ليسهل تصفّح القوائم الطويلة. */
function groupByTeacher(items: ReviewRow[]): [string, ReviewRow[]][] {
  const m = new Map<string, ReviewRow[]>();
  for (const it of items) m.set(it.teacherName, [...(m.get(it.teacherName) ?? []), it]);
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], "ar"));
}

/** أقسام قابلة للطيّ، قسم لكل مدرّس؛ تُفتح كلّها إن قلّ العدد (≤8) وإلا تُطوى. */
function TeacherGroups({
  items,
  renderRow,
}: {
  items: ReviewRow[];
  renderRow: (item: ReviewRow) => React.ReactNode;
}) {
  const openAll = items.length <= 8;
  return (
    <div className="space-y-2">
      {groupByTeacher(items).map(([name, rows]) => (
        <details key={name} open={openAll} className="group rounded-xl border border-line px-3 py-2">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
            <span>
              👤 {name}
              <span className="mr-2 text-xs font-normal text-ink/50">({rows.length})</span>
            </span>
            <span aria-hidden className="text-ink/50 transition group-open:rotate-180">
              ▾
            </span>
          </summary>
          <ul className="mt-2 space-y-2">{rows.map((item) => renderRow(item))}</ul>
        </details>
      ))}
    </div>
  );
}

export default function TeacherEnrichmentReview({
  pending,
  published,
}: {
  pending: ReviewRow[];
  published: ReviewRow[];
}) {
  const [pendingList, setPendingList] = useState(pending);
  const [publishedList, setPublishedList] = useState(published);

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h3 className="mb-1 font-display font-semibold">
          بانتظار اعتمادك
          <span className="mr-2 text-sm font-normal text-ink/50">({pendingList.length})</span>
        </h3>
        <p className="mb-3 text-xs text-ink/50">
          محتوى <b>طلب</b> مدرّسوه نشره على الصفحة العامّة (ما لم يطلبوا نشره يبقى خاصّاً بمكتباتهم ولا يظهر هنا).
          اعتماده ينقله مباشرةً للصفحة العامّة «أسئلة وإثراء» بلا رفع نسخة جديدة — فيظهر لأي زائر بلا تسجيل دخول.
        </p>
        {pendingList.length === 0 ? (
          <p className="text-sm text-ink/50">لا طلبات نشر حالياً.</p>
        ) : (
          <TeacherGroups
            items={pendingList}
            renderRow={(item) => (
              <Row
                key={item.id}
                item={item}
                actionLabel="نشر على الصفحة العامة"
                confirmText={`سيصبح «${item.title}» ظاهراً لأي زائر بلا تسجيل دخول في صفحة «أسئلة وإثراء» للصفّ ${item.gradeName}. متابعة؟`}
                onDone={() => {
                  setPendingList((l) => l.filter((x) => x.id !== item.id));
                  setPublishedList((l) => [item, ...l]);
                }}
              />
            )}
          />
        )}
      </div>

      {/* المنشور سابقاً: مطويّ افتراضياً (القائمة تطول مع الوقت)، وداخله قسم لكل مدرّس */}
      <details className="card group p-5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
          <h3 className="font-display font-semibold">
            منشور من المدرّسين
            <span className="mr-2 text-sm font-normal text-ink/50">({publishedList.length})</span>
          </h3>
          <span aria-hidden className="text-ink/50 transition group-open:rotate-180">
            ▾
          </span>
        </summary>
        <p className="mb-3 mt-2 text-xs text-ink/50">
          عناصر اعتمدتَها سابقاً وصارت عامّة. التراجع يعيدها خاصّةً بالمدرّس صاحبها (تختفي عن
          الصفحة العامّة وتعود لمكتبته فقط).
        </p>
        {publishedList.length === 0 ? (
          <p className="text-sm text-ink/50">لا عناصر معتمَدة بعد.</p>
        ) : (
          <TeacherGroups
            items={publishedList}
            renderRow={(item) => (
              <Row
                key={item.id}
                item={item}
                actionLabel="تراجع"
                confirmText={`سيختفي «${item.title}» عن الصفحة العامّة ويعود خاصّاً بمكتبة المدرّس ${item.teacherName}. متابعة؟`}
                onDone={() => {
                  // التراجع يعيده خاصّاً بالمدرّس؛ لا يعود إلى «بانتظار اعتمادك» إلا إن طلب نشره من جديد.
                  setPublishedList((l) => l.filter((x) => x.id !== item.id));
                }}
              />
            )}
          />
        )}
      </details>
    </div>
  );
}
