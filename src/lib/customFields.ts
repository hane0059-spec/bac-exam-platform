// src/lib/customFields.ts
// الحقول المخصّصة: تحميل التعريفات لجمهور معيّن، والتحقّق وتنظيف القيم.
import { prisma } from "@/lib/prisma";

export type FieldTarget = "STUDENT" | "TEACHER" | "ADMIN";

export interface FieldDef {
  id: string;
  label: string;
  fieldKey: string;
  fieldType: "TEXT" | "NUMBER" | "SELECT";
  options: string[];
  required: boolean;
}

/** تعريفات الحقول المفعّلة المنطبقة على جمهور معيّن. */
export async function getFieldDefs(target: FieldTarget): Promise<FieldDef[]> {
  const defs = await prisma.customFieldDef.findMany({
    where: { isActive: true, OR: [{ appliesTo: "ALL" }, { appliesTo: target }] },
    orderBy: { orderNum: "asc" },
    select: {
      id: true,
      label: true,
      fieldKey: true,
      fieldType: true,
      options: true,
      required: true,
    },
  });
  return defs as FieldDef[];
}

/** يتحقّق من الحقول المطلوبة وينظّف القيم إلى خريطة مفتاح→قيمة. */
export function validateAndClean(
  defs: FieldDef[],
  raw: unknown
):
  | { ok: true; data: Record<string, string> }
  | { ok: false; error: string } {
  const input = (raw ?? {}) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const d of defs) {
    const v = input[d.fieldKey];
    const s = v == null ? "" : String(v).trim();
    if (d.required && !s) {
      return { ok: false, error: `الحقل «${d.label}» مطلوب` };
    }
    if (s) out[d.fieldKey] = s;
  }
  return { ok: true, data: out };
}
