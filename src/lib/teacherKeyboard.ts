// src/lib/teacherKeyboard.ts
// قراءة/حفظ لوحة معادلات المدرّس المخصّصة (لكل مادة) في TeacherProfile.keyboardSymbols.
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { MathLayout } from "@/components/math/keyboards";
import type { BankSymbol, CustomKeyboard } from "@/components/math/symbolBank";

export type { CustomKeyboard };

const EMPTY: CustomKeyboard = { math: [], physics: [], chemistry: [] };

const symbolSchema = z.object({
  latex: z.string().min(1).max(200),
  label: z.string().min(1).max(40),
});
export const keyboardSaveSchema = z.object({
  layout: z.enum(["math", "physics", "chemistry"]),
  symbols: z.array(symbolSchema).max(60),
});

/** يطبّع قيمة JSON المخزّنة إلى CustomKeyboard كامل (بمفاتيح المواد الثلاث). */
export function normalizeKeyboard(value: unknown): CustomKeyboard {
  const out: CustomKeyboard = { math: [], physics: [], chemistry: [] };
  if (value && typeof value === "object") {
    for (const k of ["math", "physics", "chemistry"] as MathLayout[]) {
      const arr = (value as Record<string, unknown>)[k];
      if (Array.isArray(arr)) {
        out[k] = arr
          .filter(
            (x): x is BankSymbol =>
              !!x &&
              typeof (x as BankSymbol).latex === "string" &&
              typeof (x as BankSymbol).label === "string"
          )
          .map((x) => ({ latex: x.latex, label: x.label }));
      }
    }
  }
  return out;
}

/** لوحة المدرّس المخصّصة (المواد الثلاث). */
export async function getTeacherKeyboard(
  userId: string
): Promise<CustomKeyboard> {
  const p = await prisma.teacherProfile.findUnique({
    where: { userId },
    select: { keyboardSymbols: true },
  });
  return p ? normalizeKeyboard(p.keyboardSymbols) : { ...EMPTY };
}

/** رموز لوحة المدرّس لمادة واحدة (لتمريرها لمحرّر المعادلات). */
export async function getTeacherLayoutSymbols(
  userId: string,
  layout: MathLayout
): Promise<BankSymbol[]> {
  const kb = await getTeacherKeyboard(userId);
  return kb[layout] ?? [];
}

/** حفظ رموز مادة واحدة (يدمجها مع باقي المواد المحفوظة). */
export async function setTeacherLayout(
  userId: string,
  layout: MathLayout,
  symbols: BankSymbol[]
): Promise<void> {
  const current = await getTeacherKeyboard(userId);
  const next: CustomKeyboard = { ...current, [layout]: symbols };
  await prisma.teacherProfile.update({
    where: { userId },
    data: { keyboardSymbols: next as unknown as Prisma.InputJsonValue },
  });
}
