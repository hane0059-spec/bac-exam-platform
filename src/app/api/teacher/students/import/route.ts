// src/app/api/teacher/students/import/route.ts
// POST: استيراد طلاب من ملف Excel وتسجيلهم في مادة للمدرّس. بإذن المدير فقط (canManageStudents).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getTeacherSession,
  teacherTeachesSubject,
  teacherCanManageStudents,
} from "@/lib/teacher";
import { academicYearFor, remainingStudentQuota } from "@/lib/teacherStudents";
import { runExternalImport } from "@/lib/externalImportService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const file = form.get("file");
  const defaultGradeId = String(form.get("defaultGradeId") ?? "");
  const subjectId = String(form.get("subjectId") ?? "");
  const groupName = String(form.get("groupName") ?? "").trim().slice(0, 60);
  if (!(file instanceof Blob) || !defaultGradeId || !subjectId) {
    return NextResponse.json(
      { error: "الملف والمادة والصفّ الافتراضي مطلوبة" },
      { status: 400 }
    );
  }
  if (!(await teacherTeachesSubject(session.sub, subjectId))) {
    return NextResponse.json(
      { error: "لا تملك صلاحية على هذه المادة" },
      { status: 403 }
    );
  }

  const maxNew = await remainingStudentQuota(session.sub);
  if (maxNew === 0) {
    return NextResponse.json(
      { error: "بلغتَ حدّ الطلاب المسموح في اشتراكك." },
      { status: 403 }
    );
  }

  const teacher = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { schoolId: true },
  });
  const buffer = Buffer.from(await file.arrayBuffer());
  const res = await runExternalImport({
    buffer,
    filename: (file as File).name ?? "upload.xlsx",
    defaultGradeId,
    createdById: session.sub,
    quiz: null,
    schoolId: teacher?.schoolId ?? null,
    enroll: {
      teacherId: session.sub,
      subjectId,
      academicYear: await academicYearFor(session.sub, subjectId),
      groupName: groupName || null,
    },
    maxNew,
  });
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: 400 });
  }
  return NextResponse.json({ quizTitle: "بدون إسناد", ...res.result });
}
