// src/app/api/teacher/keyboard/route.ts
// GET: لوحة المدرّس المخصّصة (المواد الثلاث). POST: حفظ رموز مادة واحدة.
import { NextResponse } from "next/server";
import { getTeacherSession } from "@/lib/teacher";
import {
  getTeacherKeyboard,
  setTeacherLayout,
  keyboardSaveSchema,
} from "@/lib/teacherKeyboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getTeacherSession();
  if (!session) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }
  const keyboard = await getTeacherKeyboard(session.sub);
  return NextResponse.json({ keyboard });
}

export async function POST(req: Request) {
  const session = await getTeacherSession();
  if (!session) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const parsed = keyboardSaveSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 }
    );
  }
  await setTeacherLayout(session.sub, parsed.data.layout, parsed.data.symbols);
  return NextResponse.json({ ok: true });
}
