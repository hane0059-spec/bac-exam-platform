// src/lib/externalImportService.ts
// تنفيذ استيراد الطلاب الخارجيين وإسنادهم (مشترك بين المدير والمدرّس).
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { nextStudentCode } from "@/lib/teacherStudents";
import {
  parseStudentsFile,
  validateRow,
  randomPassword,
} from "@/lib/externalImport";

export interface ImportResult {
  created: { name: string; studentCode: string; password: string; email: string }[];
  reused: { name: string; identifier: string }[];
  errors: { row: number; reason: string }[];
}

export async function runExternalImport(opts: {
  buffer: Buffer;
  filename: string;
  defaultGradeId: string;
  createdById: string;
  quiz: { id: string; creatorId: string } | null;
}): Promise<{ ok: true; result: ImportResult } | { ok: false; error: string }> {
  const { buffer, filename, defaultGradeId, createdById, quiz } = opts;

  if (!filename.toLowerCase().endsWith(".xlsx")) {
    return { ok: false, error: "يُقبل ملف Excel (xlsx) فقط" };
  }

  const grades = await prisma.gradeLevel.findMany({
    select: { id: true, name: true, code: true },
  });
  if (!grades.some((g) => g.id === defaultGradeId)) {
    return { ok: false, error: "صفّ افتراضي غير صالح" };
  }
  const gradeByKey = new Map<string, string>();
  for (const g of grades) {
    gradeByKey.set(g.name.trim().toLowerCase(), g.id);
    gradeByKey.set(g.code.trim().toLowerCase(), g.id);
  }

  let rows: string[][];
  try {
    rows = await parseStudentsFile(buffer, filename);
  } catch {
    return { ok: false, error: "تعذّر قراءة الملف؛ تأكّد أنه CSV أو xlsx صالح" };
  }
  if (rows.length === 0) {
    return { ok: false, error: "لا صفوف بيانات في الملف" };
  }

  const result: ImportResult = { created: [], reused: [], errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2;
    const v = validateRow(rows[i]);
    if (!v.ok) {
      result.errors.push({ row: rowNum, reason: v.reason });
      continue;
    }
    const r = v.row;

    let gradeLevelId = defaultGradeId;
    if (r.gradeCell) {
      const found = gradeByKey.get(r.gradeCell.trim().toLowerCase());
      if (!found) {
        result.errors.push({ row: rowNum, reason: `صفّ غير معروف: ${r.gradeCell}` });
        continue;
      }
      gradeLevelId = found;
    }

    const email = r.email ? r.email.toLowerCase() : null;
    const fullName = `${r.firstName} ${r.lastName}`;

    if (email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        if (quiz) await assignIfNeeded(quiz.id, existing.id, quiz.creatorId);
        result.reused.push({ name: fullName, identifier: email });
        continue;
      }
    }

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
            createdById,
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
        if (quiz) {
          await prisma.quizAssignment.create({
            data: { quizId: quiz.id, studentId: user.id, teacherId: quiz.creatorId },
          });
        }
        result.created.push({
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
          continue;
        }
        result.errors.push({ row: rowNum, reason: "تعذّر الإنشاء" });
        done = true;
      }
    }
  }

  return { ok: true, result };
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
