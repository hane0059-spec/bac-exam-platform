// src/app/api/admin/external-import/route.ts
// POST: استيراد طلاب خارجيين من ملف (CSV/xlsx) وإسناد اختبار منشور لهم. (المدير حصراً.)
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin";
import { nextStudentCode } from "@/lib/teacherStudents";
import {
  parseStudentsFile,
  validateRow,
  randomPassword,
} from "@/lib/externalImport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const file = form.get("file");
  const quizId = String(form.get("quizId") ?? "");
  const defaultGradeId = String(form.get("defaultGradeId") ?? "");
  if (!(file instanceof Blob) || !quizId || !defaultGradeId) {
    return NextResponse.json(
      { error: "الملف والاختبار والصفّ الافتراضي مطلوبة" },
      { status: 400 }
    );
  }
  const filename = (file as File).name ?? "upload.csv";

  // الاختبار منشور؛ نسجّل الإسناد باسم مدرّسه.
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz || quiz.status !== "PUBLISHED") {
    return NextResponse.json(
      { error: "اختر اختباراً منشوراً" },
      { status: 400 }
    );
  }
  const grades = await prisma.gradeLevel.findMany({
    select: { id: true, name: true, code: true },
  });
  const gradeByKey = new Map<string, string>();
  for (const g of grades) {
    gradeByKey.set(g.name.trim().toLowerCase(), g.id);
    gradeByKey.set(g.code.trim().toLowerCase(), g.id);
  }
  if (!grades.some((g) => g.id === defaultGradeId)) {
    return NextResponse.json({ error: "صفّ افتراضي غير صالح" }, { status: 400 });
  }

  let rows: string[][];
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    rows = await parseStudentsFile(buffer, filename);
  } catch {
    return NextResponse.json(
      { error: "تعذّر قراءة الملف؛ تأكّد أنه CSV أو xlsx صالح" },
      { status: 400 }
    );
  }
  if (rows.length === 0) {
    return NextResponse.json(
      { error: "لا صفوف بيانات في الملف" },
      { status: 400 }
    );
  }

  const created: {
    name: string;
    studentCode: string;
    password: string;
    email: string;
  }[] = [];
  const reused: { name: string; identifier: string }[] = [];
  const errors: { row: number; reason: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // +1 للعنوان، +1 لأن العدّ من 1
    const v = validateRow(rows[i]);
    if (!v.ok) {
      errors.push({ row: rowNum, reason: v.reason });
      continue;
    }
    const r = v.row;

    // الصفّ: من العمود أو الافتراضي.
    let gradeLevelId = defaultGradeId;
    if (r.gradeCell) {
      const found = gradeByKey.get(r.gradeCell.trim().toLowerCase());
      if (!found) {
        errors.push({ row: rowNum, reason: `صفّ غير معروف: ${r.gradeCell}` });
        continue;
      }
      gradeLevelId = found;
    }

    const email = r.email ? r.email.toLowerCase() : null;
    const fullName = `${r.firstName} ${r.lastName}`;

    // إعادة استخدام حساب موجود بنفس البريد.
    if (email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        await assignIfNeeded(quiz.id, existing.id, quiz.creatorId);
        reused.push({ name: fullName, identifier: email });
        continue;
      }
    }

    // إنشاء حساب خارجي + إسناد، مع توليد رمز فريد.
    const password = r.password || randomPassword();
    const passwordHash = await bcrypt.hash(password, 10);
    let done = false;
    for (let attempt = 0; attempt < 5 && !done; attempt++) {
      const studentCode = await nextStudentCode();
      try {
        const user = await prisma.user.create({
          data: {
            email,
            passwordHash,
            role: "STUDENT",
            gender: r.gender,
            firstName: r.firstName,
            lastName: r.lastName,
            phone: r.studentPhone || null,
            createdById: session.sub,
            studentProfile: {
              create: {
                studentCode,
                gradeLevelId,
                fatherName: r.fatherName,
                motherName: r.motherName || null,
                address: r.address || null,
                parentPhone: r.parentPhone || null,
                enrollmentYear: new Date().getFullYear(),
                isExternal: true,
              },
            },
          },
          select: { id: true },
        });
        await prisma.quizAssignment.create({
          data: {
            quizId: quiz.id,
            studentId: user.id,
            teacherId: quiz.creatorId,
          },
        });
        created.push({
          name: fullName,
          studentCode,
          password,
          email: email ?? "",
        });
        done = true;
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === "P2002" &&
          Array.isArray(e.meta?.target) &&
          (e.meta?.target as string[]).some((t) => t.includes("student_code"))
        ) {
          continue; // تصادم رمز → أعد التوليد
        }
        errors.push({ row: rowNum, reason: "تعذّر الإنشاء" });
        done = true;
      }
    }
  }

  return NextResponse.json({
    quizTitle: quiz.title,
    created,
    reused,
    errors,
  });
}

async function assignIfNeeded(
  quizId: string,
  studentId: string,
  teacherId: string | null
) {
  const existing = await prisma.quizAssignment.findFirst({
    where: { quizId, studentId },
  });
  if (!existing) {
    await prisma.quizAssignment.create({
      data: { quizId, studentId, teacherId },
    });
  }
}
