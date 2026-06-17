// src/app/api/admin/external-import/export/route.ts
// POST: توليد ملف Excel ببيانات دخول الطلاب المستوردين لتوزيعها. (مدير أو مدرّس.)
import { NextResponse } from "next/server";
import { z } from "zod";
import ExcelJS from "exceljs";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  rows: z
    .array(
      z.object({
        name: z.string(),
        studentCode: z.string(),
        password: z.string(),
        email: z.string().optional().default(""),
      })
    )
    .min(1),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "TEACHER")) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("بيانات الدخول");
  ws.views = [{ rightToLeft: true }];
  ws.addRow(["الاسم", "رمز الطالب", "كلمة السرّ", "البريد"]);
  ws.getRow(1).font = { bold: true };
  for (const r of parsed.data.rows) {
    ws.addRow([r.name, r.studentCode, r.password, r.email]);
  }
  ws.columns.forEach((c) => (c.width = 20));

  const buf = Buffer.from(await wb.xlsx.writeBuffer());
  return new Response(buf, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="student_credentials.xlsx"',
    },
  });
}
