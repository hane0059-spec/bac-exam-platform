// src/app/notifications/page.tsx
// إشعارات المستخدم (كل الأدوار).
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listNotifications } from "@/lib/notifications";
import DashboardShell from "@/components/DashboardShell";
import NotificationsList from "@/components/NotificationsList";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const items = await listNotifications(session.sub);

  return (
    <DashboardShell session={session}>
      <h2 className="mb-4 font-display text-xl font-bold">الإشعارات</h2>
      <NotificationsList
        items={items.map((n) => ({
          id: n.id,
          message: n.message,
          linkUrl: n.linkUrl,
          isRead: n.isRead,
          createdAt: n.createdAt.toISOString(),
        }))}
      />
    </DashboardShell>
  );
}
