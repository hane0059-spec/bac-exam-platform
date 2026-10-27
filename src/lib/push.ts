// src/lib/push.ts
// إرسال إشعارات الدفع (Web Push) لأجهزة المستخدمين. مفاتيح VAPID من البيئة؛ إن غابت تُعطَّل الخاصّية بصمت.
import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { getBranding } from "@/lib/branding";
import { buildPushPayload, pushBodyForType, type PushPayload } from "@/lib/pushPayload";

let configured: boolean | null = null;

function configure(): boolean {
  if (configured !== null) return configured;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) {
    configured = false;
    return false;
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", pub, priv);
  configured = true;
  return true;
}

export function pushEnabled(): boolean {
  return configure();
}

export function pushPublicKey(): string | null {
  return configure() ? process.env.VAPID_PUBLIC_KEY! : null;
}

const CONCURRENCY = 20;

/**
 * يرسل الحمولة لكل أجهزة المستخدمين. لا يرمي أبداً (فشل الدفع لا يكسر العملية الأصلية)،
 * ويحذف الاشتراكات الميتة (404/410). `budgetMs` سقف زمني كي لا يعلّق ردّ الخادم.
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
  budgetMs = 5000
): Promise<{ sent: number; removed: number }> {
  const result = { sent: 0, removed: 0 };
  try {
    if (!configure() || userIds.length === 0) return result;
    const subs = await prisma.pushSubscription.findMany({
      where: { userId: { in: [...new Set(userIds)] } },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });
    if (subs.length === 0) return result;
    const body = JSON.stringify(payload);
    const dead: string[] = [];
    const work = (async () => {
      for (let i = 0; i < subs.length; i += CONCURRENCY) {
        await Promise.allSettled(
          subs.slice(i, i + CONCURRENCY).map(async (s) => {
            try {
              await webpush.sendNotification(
                { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                body,
                { TTL: 60 * 60 * 24, urgency: "normal" }
              );
              result.sent++;
            } catch (e) {
              const code = (e as { statusCode?: number }).statusCode;
              if (code === 404 || code === 410) dead.push(s.id);
            }
          })
        );
      }
    })();
    await Promise.race([work, new Promise((r) => setTimeout(r, budgetMs))]);
    if (dead.length) {
      await prisma.pushSubscription.deleteMany({ where: { id: { in: dead } } });
      result.removed = dead.length;
    }
  } catch {
    // الدفع best-effort.
  }
  return result;
}

/** إشعار دفع يقابل إشعاراً داخل التطبيق: عنوان حسب النوع بلا أسماء/درجات/نصّ الرسالة. */
export async function pushForNotification(
  userIds: string[],
  linkUrl?: string | null,
  type?: string | null
): Promise<void> {
  if (!configure()) return;
  let title = "إتقان";
  try {
    title = (await getBranding()).name || title;
  } catch {
    // الاسم الافتراضي.
  }
  await sendPushToUsers(userIds, buildPushPayload({ title, linkUrl, body: pushBodyForType(type) }));
}
