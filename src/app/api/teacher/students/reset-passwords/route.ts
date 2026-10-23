// src/app/api/teacher/students/reset-passwords/route.ts
// POST: إعادة تعيين كلمات سرّ طلاب مجموعة (مادة + مجموعة) دفعة واحدة وإعادتها للمدرّس لطباعة البطاقات.
// المدرّس المُنشئ فقط + إذن إدارة الطلاب. يُستثنى من دخل المنصّة فعلاً (لا تُبطَل كلمة سرّ غيّرها بنفسه).
import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  getTeacherSession,
  teacherTeachesSubject,
  teacherCanManageStudents,
} from "@/lib/teacher";
import { randomPassword } from "@/lib/externalImport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BATCH = 200;
const schema = z.object({
  subjectId: z.string().min(1),
  // "" = طلاب بلا مجموعة.
  groupName: z.string().trim().max(60),
});

export async function POST(req: Request) {
  const session = await getTeacherSession();
  if (!session) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }
  if (!(await teacherCanManageStudents(session.sub))) {
    return NextResponse.json(
      { error: "إدارة الطلاب غير مفعّلة لحسابك — اطلبها من إدارة المؤسّسة." },
      { status: 403 }
    );
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
  const { subjectId, groupName } = parsed.data;
  if (!(await teacherTeachesSubject(session.sub, subjectId))) {
    return NextResponse.json({ error: "لا تملك صلاحية على هذه المادة" }, { status: 403 });
  }

  const students = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      createdById: session.sub,
      studentEnrollments: {
        some: {
          teacherId: session.sub,
          subjectId,
          isActive: true,
          groupName: groupName ? groupName : null,
        },
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      lastSeenAt: true,
      studentProfile: { select: { studentCode: true } },
      examSessions: { select: { id: true }, take: 1 },
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    take: MAX_BATCH + 1,
  });
  if (students.length > MAX_BATCH) {
    return NextResponse.json(
      { error: `المجموعة أكبر من ${MAX_BATCH} طالب — قسّمها أولاً.` },
      { status: 400 }
    );
  }

  const skipped: { name: string; studentCode: string }[] = [];
  const targets: typeof students = [];
  for (const s of students) {
    if (s.lastSeenAt || s.examSessions.length > 0) {
      skipped.push({
        name: `${s.firstName} ${s.lastName}`,
        studentCode: s.studentProfile?.studentCode ?? "—",
      });
    } else {
      targets.push(s);
    }
  }

  const reset: { name: string; studentCode: string; password: string; group: string }[] = [];
  const updates: Prisma.PrismaPromise<unknown>[] = [];
  for (let i = 0; i < targets.length; i += 10) {
    const chunk = targets.slice(i, i + 10).map((s) => ({ s, password: randomPassword() }));
    const hashes = await Promise.all(chunk.map((c) => bcrypt.hash(c.password, 10)));
    chunk.forEach((c, j) => {
      updates.push(
        prisma.user.update({
          where: { id: c.s.id },
          data: { passwordHash: hashes[j], mustChangePassword: true },
        })
      );
      reset.push({
        name: `${c.s.firstName} ${c.s.lastName}`,
        studentCode: c.s.studentProfile?.studentCode ?? "—",
        password: c.password,
        group: groupName,
      });
    });
  }
  if (updates.length > 0) await prisma.$transaction(updates);

  return NextResponse.json({ reset, skipped });
}
