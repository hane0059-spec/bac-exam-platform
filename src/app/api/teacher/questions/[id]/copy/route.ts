// src/app/api/teacher/questions/[id]/copy/route.ts
// المدرّس ينسخ سؤالاً من البنك العام (isPublic) إلى بنكه الخاصّ ليعدّله ويستعمله.
// حراسة: المصدر عامّ ونشط، والمادة ضمن موادّ المدرّس.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTeacherSession, teacherTeachesSubject } from "@/lib/teacher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getTeacherSession();
  if (!session) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }

  const src = await prisma.question.findUnique({
    where: { id: params.id },
    include: {
      options: { orderBy: { orderNum: "asc" } },
      matchingPairs: { orderBy: { orderNum: "asc" } },
    },
  });
  if (!src || !src.isActive || !src.isPublic) {
    return NextResponse.json(
      { error: "السؤال غير متاح في البنك العام" },
      { status: 404 }
    );
  }
  if (!(await teacherTeachesSubject(session.sub, src.subjectId))) {
    return NextResponse.json(
      { error: "لا تدرّس مادة هذا السؤال" },
      { status: 403 }
    );
  }

  // نسخة تحت ملكية المدرّس: خاصّة (isPublic=false) وقابلة للتعديل.
  const created = await prisma.question.create({
    data: {
      creatorId: session.sub,
      subjectId: src.subjectId,
      chapterId: src.chapterId,
      conceptId: src.conceptId,
      inBank: true,
      isPublic: false,
      type: src.type,
      content: src.content,
      difficulty: src.difficulty,
      points: src.points,
      explanation: src.explanation,
      tags: src.tags,
      acceptedAnswers: src.acceptedAnswers,
      options: {
        create: src.options.map((o) => ({
          label: o.label,
          content: o.content,
          isCorrect: o.isCorrect,
          orderNum: o.orderNum,
        })),
      },
      matchingPairs: {
        create: src.matchingPairs.map((p) => ({
          leftItem: p.leftItem,
          rightItem: p.rightItem,
          orderNum: p.orderNum,
        })),
      },
    },
    select: { id: true },
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
