"use client";
// src/components/admin/UsersTree.tsx
// شجرة المستخدمين القابلة للطيّ مع تحميل كسول: تُرسَل البنية والأعداد فقط،
// وتُجلَب عناصر كل فرع (الطلاب/الأعضاء) عند فتحه أوّل مرّة.
import { useState } from "react";
import Link from "next/link";

export interface LeafItem {
  id: string;
  name: string;
  meta?: string; // سطر الرمز/البريد (LTR)
  badge?: string; // وسم الدور
  inactive?: boolean;
  editHref?: string;
  managedNote?: string; // مثل «يُدار من مدرّسه»
}

// وصف جلب كسول لعناصر الفرع (يُحلّ في /api/admin/users/tree-leaves).
export interface TreeLazy {
  kind: "students" | "staff";
  school: string; // رمز المؤسّسة: معرّف أو "__none__"
  grade?: string; // رمز الصفّ (للطلاب): معرّف أو "__none__"
  role?: "TEACHER" | "ADMIN"; // لتجميع الأعضاء حسب الدور (مدير المدرسة)
}

export interface TreeNode {
  id: string;
  label: string;
  count: number;
  defaultOpen?: boolean;
  children?: TreeNode[]; // مجموعات فرعية (بنية معروفة مسبقاً)
  leaves?: LeafItem[]; // عناصر محمّلة مسبقاً (اختياري)
  lazy?: TreeLazy; // إن وُجد: تُجلَب العناصر عند الفتح
}

function LeafRow({ leaf }: { leaf: LeafItem }) {
  return (
    <div className="card flex flex-wrap items-center justify-between gap-2 px-3 py-2">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{leaf.name}</span>
          {leaf.badge && (
            <span className="rounded-full bg-ink/5 px-2 py-0.5 text-xs text-ink/60">
              {leaf.badge}
            </span>
          )}
          {leaf.inactive && (
            <span className="rounded-full bg-ink/10 px-2 py-0.5 text-xs text-ink/50">
              موقوف
            </span>
          )}
        </div>
        {leaf.meta && (
          <p className="mt-0.5 text-xs text-ink/40" dir="ltr">
            {leaf.meta}
          </p>
        )}
      </div>
      {leaf.editHref ? (
        <Link
          href={leaf.editHref}
          className="text-sm text-primary hover:underline"
        >
          تحرير
        </Link>
      ) : leaf.managedNote ? (
        <span className="text-xs text-ink/40">{leaf.managedNote}</span>
      ) : null}
    </div>
  );
}

function Branch({ node }: { node: TreeNode }) {
  const [open, setOpen] = useState(!!node.defaultOpen);
  const [leaves, setLeaves] = useState<LeafItem[] | null>(node.leaves ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hasChildren = (node.children?.length ?? 0) > 0;

  async function toggle() {
    const next = !open;
    setOpen(next);
    // جلب كسول أوّل فتح لفرعٍ موصوفٍ بـ lazy وغير محمّل بعد.
    if (next && node.lazy && leaves === null && !loading) {
      setLoading(true);
      setError("");
      try {
        const p = new URLSearchParams({
          kind: node.lazy.kind,
          school: node.lazy.school,
        });
        if (node.lazy.grade) p.set("grade", node.lazy.grade);
        if (node.lazy.role) p.set("role", node.lazy.role);
        const res = await fetch(`/api/admin/users/tree-leaves?${p}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) setError(data.error ?? "تعذّر التحميل.");
        else setLeaves(data.leaves ?? []);
      } catch {
        setError("خطأ في الاتصال.");
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div>
      <button
        onClick={toggle}
        className="flex w-full items-center justify-between gap-2 rounded-lg bg-ink/5 px-3 py-2 text-right transition hover:bg-primary-light"
      >
        <span className="flex items-center gap-2 font-medium">
          <span className="text-xs text-ink/40">{open ? "▾" : "◂"}</span>
          {node.label}
        </span>
        <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-ink/50">
          {node.count}
        </span>
      </button>

      {open && (
        <div className="mt-1.5 space-y-1.5" style={{ paddingInlineStart: 14 }}>
          {node.children?.map((c) => <Branch key={c.id} node={c} />)}

          {loading && (
            <p className="px-3 py-1 text-xs text-ink/40">…جارٍ التحميل</p>
          )}
          {error && <p className="px-3 py-1 text-xs text-red-600">{error}</p>}

          {leaves && leaves.length > 0 && (
            <div className="space-y-1">
              {leaves.map((l) => (
                <LeafRow key={l.id} leaf={l} />
              ))}
            </div>
          )}
          {leaves && leaves.length === 0 && !loading && (
            <p className="px-3 py-1 text-xs text-ink/40">لا عناصر.</p>
          )}
          {!hasChildren && !node.lazy && !leaves && !loading && (
            <p className="px-3 py-1 text-xs text-ink/40">لا عناصر.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function UsersTree({
  roots,
  emptyLabel,
}: {
  roots: TreeNode[];
  emptyLabel: string;
}) {
  if (roots.length === 0) {
    return (
      <div className="card p-8 text-center text-ink/60">{emptyLabel}</div>
    );
  }
  return (
    <div className="space-y-2">
      {roots.map((r) => (
        <Branch key={r.id} node={r} />
      ))}
    </div>
  );
}
