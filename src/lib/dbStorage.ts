// src/lib/dbStorage.ts
// حجم قاعدة البيانات مقابل حدّ الخطة (Neon المجانية 0.5GB). الملفّات (مرفقات + «أسئلة وإثراء») مخزَّنة داخل
// القاعدة، فاقترابها من الحدّ يوقف الكتابة عند بلوغه. الدوال النقيّة مُختبَرة؛ القراءة من القاعدة في
// `readDbStorage` (خادم فقط).
import { prisma } from "@/lib/prisma";

export const DEFAULT_DB_LIMIT_MB = 512; // Neon المجانية: 0.5GB
export const WARN_AT = 0.7; // تنبيه
export const CRITICAL_AT = 0.9; // حرِج

export type StorageLevel = "ok" | "warn" | "critical";

export function dbLimitBytes(env: string | undefined = process.env.DB_STORAGE_LIMIT_MB): number {
  const n = Number(env);
  return (Number.isFinite(n) && n >= 20 ? n : DEFAULT_DB_LIMIT_MB) * 1024 * 1024;
}

export function storageLevel(usedBytes: number, limitBytes: number): StorageLevel {
  if (limitBytes <= 0) return "ok";
  const r = usedBytes / limitBytes;
  return r >= CRITICAL_AT ? "critical" : r >= WARN_AT ? "warn" : "ok";
}

export function usagePercent(usedBytes: number, limitBytes: number): number {
  if (limitBytes <= 0) return 0;
  return Math.min(100, Math.round((usedBytes / limitBytes) * 100));
}

/** تسميات عربية لأكبر الجداول (الباقي بأسمائها). */
export const TABLE_LABELS: Record<string, string> = {
  enrichment_files: "ملفّات «أسئلة وإثراء»",
  attachments: "مرفقات الاختبارات الورقية والصور",
  app_settings: "الإعدادات (وأجزاء الرفع المؤقّتة)",
  student_answers: "إجابات الطلاب",
  _SelectedOptions: "ربط الإجابات بخياراتها",
  exam_sessions: "جلسات الاختبارات",
  questions: "الأسئلة",
  question_options: "خيارات الأسئلة",
  notifications: "الإشعارات",
  users: "المستخدمون",
};

export interface DbStorage {
  usedBytes: number;
  limitBytes: number;
  level: StorageLevel;
  percent: number;
  topTables: { name: string; bytes: number }[];
}

/** قراءة الحجم الفعلي (يفشل بصمت ← null فلا تتعطّل الصفحة إن لم يتوفّر). */
export async function readDbStorage(withTables = false): Promise<DbStorage | null> {
  try {
    const [size] = await prisma.$queryRaw<{ size: bigint }[]>`select pg_database_size(current_database())::bigint as size`;
    const usedBytes = Number(size?.size ?? 0);
    const limitBytes = dbLimitBytes();
    let topTables: DbStorage["topTables"] = [];
    if (withTables) {
      const rows = await prisma.$queryRaw<{ name: string; bytes: bigint }[]>`
        select c.relname as name, pg_total_relation_size(c.oid)::bigint as bytes
        from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r'
        order by 2 desc limit 6`;
      topTables = rows.map((r) => ({ name: r.name, bytes: Number(r.bytes) }));
    }
    return {
      usedBytes,
      limitBytes,
      level: storageLevel(usedBytes, limitBytes),
      percent: usagePercent(usedBytes, limitBytes),
      topTables,
    };
  } catch {
    return null;
  }
}
