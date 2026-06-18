"use client";
// src/components/admin/UsersTree.tsx
// شجرة المستخدمين القابلة للطيّ (مؤسّسة ← صفّ ← طلاب / مؤسّسة ← مدرّسون).
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

export interface TreeNode {
  id: string;
  label: string;
  count: number;
  defaultOpen?: boolean;
  children?: TreeNode[]; // مجموعات فرعية
  leaves?: LeafItem[]; // عناصر طرفية
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
  const hasChildren = (node.children?.length ?? 0) > 0;
  const hasLeaves = (node.leaves?.length ?? 0) > 0;

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-lg bg-ink/5 px-3 py-2 text-right transition hover:bg-primary-light"
      >
        <span className="flex items-center gap-2 font-medium">
          <span className="text-xs text-ink/40">{open ? "▾" : "◂"}</span>
          {node.label}
        </span>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs text-ink/50">
          {node.count}
        </span>
      </button>

      {open && (
        <div className="mt-1.5 space-y-1.5" style={{ paddingInlineStart: 14 }}>
          {node.children?.map((c) => <Branch key={c.id} node={c} />)}
          {hasLeaves && (
            <div className="space-y-1">
              {node.leaves!.map((l) => (
                <LeafRow key={l.id} leaf={l} />
              ))}
            </div>
          )}
          {!hasChildren && !hasLeaves && (
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
