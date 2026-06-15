// prisma/seed.ts
// بذور أولية: الصفوف + مادة تجريبية + 3 حسابات تجريبية (مدير/مدرّس/طالب)
// idempotent: يمكن تشغيله أكثر من مرة دون تكرار.

import { PrismaClient, Role, Gender } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ACADEMIC_YEAR = "2024-2025";

async function main() {
  // ── الصفوف الدراسية ───────────────────────────────
  const grades = [
    { name: "السنة الأولى ابتدائي", code: "G1", orderNum: 1 },
    { name: "السنة الرابعة متوسط", code: "M4", orderNum: 9 },
    { name: "بكالوريا علوم تجريبية", code: "BAC_SCI", orderNum: 13 },
    { name: "بكالوريا آداب", code: "BAC_LIT", orderNum: 14 },
  ];

  for (const g of grades) {
    await prisma.gradeLevel.upsert({
      where: { code: g.code },
      update: { name: g.name, orderNum: g.orderNum },
      create: g,
    });
  }

  const bacSci = await prisma.gradeLevel.findUniqueOrThrow({
    where: { code: "BAC_SCI" },
  });

  // ── مادة تجريبية ──────────────────────────────────
  const subject = await prisma.subject.upsert({
    where: { code: "PHYS_CHEM" },
    update: {},
    create: {
      name: "الفيزياء والكيمياء",
      code: "PHYS_CHEM",
      gradeLevelId: bacSci.id,
      description: "مادة تجريبية للاختبار الأولي",
      color: "#1F7A63",
    },
  });

  // ── الحسابات التجريبية ────────────────────────────
  const passwords = {
    admin: await bcrypt.hash("Admin@123", 10),
    teacher: await bcrypt.hash("Teacher@123", 10),
    student: await bcrypt.hash("Student@123", 10),
  };

  // المدير
  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      passwordHash: passwords.admin,
      role: Role.ADMIN,
      gender: Gender.MALE,
      firstName: "أحمد",
      lastName: "بن صالح",
    },
  });

  // المدرّسة
  const teacher = await prisma.user.upsert({
    where: { email: "teacher@example.com" },
    update: {},
    create: {
      email: "teacher@example.com",
      passwordHash: passwords.teacher,
      role: Role.TEACHER,
      gender: Gender.FEMALE,
      firstName: "فاطمة",
      lastName: "الزهراء",
      teacherProfile: {
        create: { employeeCode: "T-1001", qualification: "أستاذة الفيزياء" },
      },
    },
  });

  // الطالب
  const student = await prisma.user.upsert({
    where: { email: "student@example.com" },
    update: {},
    create: {
      email: "student@example.com",
      passwordHash: passwords.student,
      role: Role.STUDENT,
      gender: Gender.MALE,
      firstName: "يوسف",
      lastName: "حدّاد",
      studentProfile: {
        create: {
          studentCode: "S-1001",
          gradeLevelId: bacSci.id,
          enrollmentYear: 2024,
        },
      },
    },
  });

  // ── ربط المدرّسة بالمادة ──────────────────────────
  await prisma.teacherSubject.upsert({
    where: {
      teacherId_subjectId_academicYear: {
        teacherId: teacher.id,
        subjectId: subject.id,
        academicYear: ACADEMIC_YEAR,
      },
    },
    update: {},
    create: {
      teacherId: teacher.id,
      subjectId: subject.id,
      academicYear: ACADEMIC_YEAR,
    },
  });

  // ── تسجيل الطالب في المادة ────────────────────────
  const existingEnrollment = await prisma.studentEnrollment.findFirst({
    where: {
      studentId: student.id,
      subjectId: subject.id,
      academicYear: ACADEMIC_YEAR,
    },
  });
  if (!existingEnrollment) {
    await prisma.studentEnrollment.create({
      data: {
        studentId: student.id,
        teacherId: teacher.id,
        subjectId: subject.id,
        academicYear: ACADEMIC_YEAR,
      },
    });
  }

  console.log("✓ تمت تهيئة البذور بنجاح");
  console.log("  المدير:  admin@example.com / Admin@123");
  console.log("  المدرّسة: teacher@example.com / Teacher@123");
  console.log("  الطالب:  student@example.com / Student@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
