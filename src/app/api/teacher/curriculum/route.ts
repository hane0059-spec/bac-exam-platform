// src/app/api/teacher/curriculum/route.ts
// POST موحّد: إنشاء/تعديل/حذف وحدة أو فصل أو درس. (المدرّس على موادّه فقط.)
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTeacherSession, teacherTeachesSubject } from "@/lib/teacher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  action: z.enum(["create", "update", "delete"]),
  type: z.enum(["unit", "chapter", "lesson"]),
  id: z.string().optional(),
  subjectId: z.string().optional(),
  unitId: z.string().optional(),
  chapterId: z.string().optional(),
  title: z.string().trim().optional(),
  orderNum: z.number().int().min(0).optional(),
});

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
  const p = schema.safeParse(raw);
  if (!p.success) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }
  const d = p.data;

  const own = (subjectId: string) =>
    teacherTeachesSubject(session.sub, subjectId);
  const bad = (msg: string, code = 400) =>
    NextResponse.json({ error: msg }, { status: code });

  // ───── إنشاء ─────
  if (d.action === "create") {
    if (!d.title) return bad("العنوان مطلوب");
    if (d.type === "unit") {
      if (!d.subjectId || !(await own(d.subjectId)))
        return bad("مادة غير صالحة", 403);
      const u = await prisma.unit.create({
        data: { subjectId: d.subjectId, title: d.title, orderNum: d.orderNum ?? 0 },
        select: { id: true },
      });
      return NextResponse.json({ id: u.id }, { status: 201 });
    }
    if (d.type === "chapter") {
      if (!d.unitId) return bad("الوحدة مطلوبة");
      const unit = await prisma.unit.findUnique({ where: { id: d.unitId } });
      if (!unit || !(await own(unit.subjectId))) return bad("وحدة غير صالحة", 403);
      const c = await prisma.chapter.create({
        data: {
          subjectId: unit.subjectId,
          unitId: unit.id,
          title: d.title,
          orderNum: d.orderNum ?? 0,
        },
        select: { id: true },
      });
      return NextResponse.json({ id: c.id }, { status: 201 });
    }
    // lesson
    if (!d.chapterId) return bad("الفصل مطلوب");
    const ch = await prisma.chapter.findUnique({ where: { id: d.chapterId } });
    if (!ch || !(await own(ch.subjectId))) return bad("فصل غير صالح", 403);
    const l = await prisma.concept.create({
      data: { chapterId: ch.id, title: d.title },
      select: { id: true },
    });
    return NextResponse.json({ id: l.id }, { status: 201 });
  }

  if (!d.id) return bad("المعرّف مطلوب");

  // ───── تعديل ─────
  if (d.action === "update") {
    if (!d.title) return bad("العنوان مطلوب");
    if (d.type === "unit") {
      const u = await prisma.unit.findUnique({ where: { id: d.id } });
      if (!u || !(await own(u.subjectId))) return bad("غير موجود", 404);
      await prisma.unit.update({
        where: { id: u.id },
        data: { title: d.title, orderNum: d.orderNum ?? u.orderNum },
      });
    } else if (d.type === "chapter") {
      const c = await prisma.chapter.findUnique({ where: { id: d.id } });
      if (!c || !(await own(c.subjectId))) return bad("غير موجود", 404);
      await prisma.chapter.update({
        where: { id: c.id },
        data: { title: d.title, orderNum: d.orderNum ?? c.orderNum },
      });
    } else {
      const l = await prisma.concept.findUnique({
        where: { id: d.id },
        include: { chapter: { select: { subjectId: true } } },
      });
      if (!l || !(await own(l.chapter.subjectId))) return bad("غير موجود", 404);
      await prisma.concept.update({ where: { id: l.id }, data: { title: d.title } });
    }
    return NextResponse.json({ id: d.id });
  }

  // ───── حذف (محميّ) ─────
  if (d.type === "unit") {
    const u = await prisma.unit.findUnique({ where: { id: d.id } });
    if (!u || !(await own(u.subjectId))) return bad("غير موجود", 404);
    if ((await prisma.chapter.count({ where: { unitId: u.id } })) > 0)
      return bad("لا يمكن حذف وحدة تحتوي فصولاً", 409);
    await prisma.unit.delete({ where: { id: u.id } });
  } else if (d.type === "chapter") {
    const c = await prisma.chapter.findUnique({ where: { id: d.id } });
    if (!c || !(await own(c.subjectId))) return bad("غير موجود", 404);
    const [lessons, questions] = await Promise.all([
      prisma.concept.count({ where: { chapterId: c.id } }),
      prisma.question.count({ where: { chapterId: c.id } }),
    ]);
    if (lessons > 0 || questions > 0)
      return bad("لا يمكن حذف فصل يحتوي دروساً أو أسئلة", 409);
    await prisma.chapter.delete({ where: { id: c.id } });
  } else {
    const l = await prisma.concept.findUnique({
      where: { id: d.id },
      include: { chapter: { select: { subjectId: true } } },
    });
    if (!l || !(await own(l.chapter.subjectId))) return bad("غير موجود", 404);
    if ((await prisma.question.count({ where: { conceptId: l.id } })) > 0)
      return bad("لا يمكن حذف درس مرتبط بأسئلة", 409);
    await prisma.concept.delete({ where: { id: l.id } });
  }
  return NextResponse.json({ ok: true });
}
