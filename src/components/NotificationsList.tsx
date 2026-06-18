"use client";
// src/components/NotificationsList.tsx
// قائمة الإشعارات — تعلّم الكل كمقروء عند الفتح وتحدّث العدّاد.
import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/datetime";

export interface NotificationItem {
  id: string;
  message: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsList({
  items,
}: {
  items: NotificationItem[];
}) {
  const router = useRouter();
  const done = useRef(false);
  const hasUnread = items.some((n) => !n.isRead);

  useEffect(() => {
    if (done.current || !hasUnread) return;
    done.current = true;
    fetch("/api/notifications/read", { method: "POST" })
      .then(() => router.refresh())
      .catch(() => {});
  }, [hasUnread, router]);

  if (items.length === 0) {
    return (
      <div className="card p-8 text-center text-ink/60">لا إشعارات.</div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((n) => {
        const body = (
          <div
            className={`card flex items-start justify-between gap-3 p-4 ${
              n.isRead ? "" : "border-r-4 border-r-primary"
            }`}
          >
            <div>
              <p className="text-sm leading-relaxed">{n.message}</p>
              <p className="mt-1 text-xs text-ink/40">
                <bdi dir="ltr">{formatDateTime(n.createdAt)}</bdi>
              </p>
            </div>
            {n.linkUrl && (
              <span className="shrink-0 text-sm text-primary">عرض ←</span>
            )}
          </div>
        );
        return n.linkUrl ? (
          <Link key={n.id} href={n.linkUrl} className="block">
            {body}
          </Link>
        ) : (
          <div key={n.id}>{body}</div>
        );
      })}
    </div>
  );
}
