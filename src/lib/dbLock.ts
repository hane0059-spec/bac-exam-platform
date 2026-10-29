// src/lib/dbLock.ts
// معاملة بقفل استشاري (advisory) على مفتاح نصّي: تُسلسل الطلبات المتوازية على المورد نفسه (طالب+اختبار، حساب دخول…)
// لإغلاق تسابق «تحقّق ثم اكتب». القفل يُحرَّر تلقائياً مع نهاية المعاملة، ومفتاحان مختلفان لا يتعطّلان.
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function withAdvisoryLock<T>(
  key: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  /** مهلة المعاملة كلّها (تشمل انتظار القفل)؛ ارفعها حيث يُتوقَّع طابور (دفعة تسجيلات). */
  timeoutMs = 10_000
): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      // ::text لأنّ دالة القفل تُرجع void وPrisma لا يفكّ ترميزه.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))::text`;
      return fn(tx);
    },
    { timeout: timeoutMs, maxWait: timeoutMs }
  );
}
