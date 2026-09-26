// src/app/notifications/page.tsx
// إشعارات المستخدم (كل الأدوار).
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listNotifications } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import DashboardShell from "@/components/DashboardShell";
import NotificationsList from "@/components/NotificationsList";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const items = await listNotifications(session.sub);

  // حالة «تمّ التنفيذ» بجانب زرّ العرض: التصحيح (جلسة بلا إجابات معلّقة) والرسائل (تمّ الردّ).
  const sessionIds = new Set<string>();
  const parentMsgIds = new Set<string>();
  const studentMsgIds = new Set<string>();
  for (const n of items) {
    const u = n.linkUrl ?? "";
    if (n.type === "exam_needs_grading") {
      const m = u.match(/^\/teacher\/sessions\/([\w-]+)$/);
      if (m) sessionIds.add(m[1]);
    } else if (n.type === "parent_message") {
      const m = u.match(/[?&]p=([\w-]+)/);
      if (m) parentMsgIds.add(m[1]);
    } else if (n.type === "student_message") {
      const m = u.match(/[?&]s=([\w-]+)/);
      if (m) studentMsgIds.add(m[1]);
    }
  }
  const [pendingSessions, answeredParent, answeredStudent] = await Promise.all([
    sessionIds.size
      ? prisma.studentAnswer.groupBy({
          by: ["sessionId"],
          where: { sessionId: { in: [...sessionIds] }, needsReview: true },
        })
      : [],
    parentMsgIds.size
      ? prisma.parentMessage.findMany({
          where: { id: { in: [...parentMsgIds] }, status: "ANSWERED" },
          select: { id: true },
        })
      : [],
    studentMsgIds.size
      ? prisma.studentMessage.findMany({
          where: { id: { in: [...studentMsgIds] }, status: "ANSWERED" },
          select: { id: true },
        })
      : [],
  ]);
  const stillPending = new Set(pendingSessions.map((r) => r.sessionId));
  const ansP = new Set(answeredParent.map((r) => r.id));
  const ansS = new Set(answeredStudent.map((r) => r.id));

  function statusOf(n: (typeof items)[number]) {
    const u = n.linkUrl ?? "";
    if (n.type === "exam_needs_grading") {
      const m = u.match(/^\/teacher\/sessions\/([\w-]+)$/);
      if (!m) return null;
      return stillPending.has(m[1])
        ? { done: false, text: "بانتظار تصحيحك" }
        : { done: true, text: "تمّ التصحيح" };
    }
    if (n.type === "parent_message" || n.type === "student_message") {
      const m = u.match(n.type === "parent_message" ? /[?&]p=([\w-]+)/ : /[?&]s=([\w-]+)/);
      if (!m) return null;
      const answered = (n.type === "parent_message" ? ansP : ansS).has(m[1]);
      return answered
        ? { done: true, text: "تمّ الردّ" }
        : { done: false, text: "بانتظار ردّك" };
    }
    return null;
  }

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
          status: statusOf(n),
        }))}
      />
    </DashboardShell>
  );
}
