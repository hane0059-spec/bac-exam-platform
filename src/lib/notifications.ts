// src/lib/notifications.ts
// إشعارات داخل التطبيق (بلا مزوّد خارجي).
import { prisma } from "@/lib/prisma";

export async function createNotification(params: {
  userId: string;
  type: string;
  message: string;
  linkUrl?: string | null;
}): Promise<void> {
  await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      message: params.message,
      linkUrl: params.linkUrl ?? null,
    },
  });
}

export function unreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

export function listNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

/** يعلّم إشعاراً واحداً (id) أو كلّ إشعارات المستخدم كمقروءة. */
export async function markRead(userId: string, id?: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, ...(id ? { id } : {}), isRead: false },
    data: { isRead: true },
  });
}
