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
    update: { isSuperAdmin: true },
    create: {
      email: "admin@example.com",
      passwordHash: passwords.admin,
      role: Role.ADMIN,
      gender: Gender.MALE,
      firstName: "أحمد",
      lastName: "بن صالح",
      isSuperAdmin: true,
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

  // ── اختبار تجريبي خطّي منشور + أسئلته + إسناده للطالب ──
  // idempotent: يُنشأ مرّة واحدة (يُتخطّى إن وُجد اختبار بالعنوان نفسه للمدرّسة).
  const SAMPLE_QUIZ_TITLE = "اختبار تجريبي: مقدمة في الكهرباء";
  const existingQuiz = await prisma.quiz.findFirst({
    where: { title: SAMPLE_QUIZ_TITLE, creatorId: teacher.id },
  });

  if (!existingQuiz) {
    await prisma.$transaction(async (tx) => {
      const chapter = await tx.chapter.create({
        data: {
          subjectId: subject.id,
          title: "الكهرباء الأساسية",
          orderNum: 1,
          description: "فصل تمهيدي لاختبار حلقة الطالب",
        },
      });

      const concept = await tx.concept.create({
        data: { chapterId: chapter.id, title: "التيار والمقاومة" },
      });

      const baseQ = {
        creatorId: teacher.id,
        subjectId: subject.id,
        chapterId: chapter.id,
        conceptId: concept.id,
        points: 1,
      };

      // 1) اختيار من متعدد
      const q1 = await tx.question.create({
        data: {
          ...baseQ,
          type: "MULTIPLE_CHOICE",
          content: "ما وحدة قياس شدة التيار الكهربائي؟",
          explanation: "شدة التيار تُقاس بالأمبير (A).",
          options: {
            create: [
              { label: "أ", content: "الفولت", isCorrect: false, orderNum: 1 },
              { label: "ب", content: "الأمبير", isCorrect: true, orderNum: 2 },
              { label: "ج", content: "الأوم", isCorrect: false, orderNum: 3 },
              { label: "د", content: "الواط", isCorrect: false, orderNum: 4 },
            ],
          },
        },
      });

      // 2) صح أو خطأ
      const q2 = await tx.question.create({
        data: {
          ...baseQ,
          type: "TRUE_FALSE",
          content: "المقاومة الكهربائية تُقاس بوحدة الأوم.",
          explanation: "صحيح؛ وحدة المقاومة هي الأوم (Ω).",
          options: {
            create: [
              { label: "صح", content: "صح", isCorrect: true, orderNum: 1 },
              { label: "خطأ", content: "خطأ", isCorrect: false, orderNum: 2 },
            ],
          },
        },
      });

      // 3) إجابة قصيرة
      const q3 = await tx.question.create({
        data: {
          ...baseQ,
          type: "SHORT_ANSWER",
          content:
            "أكمل: ينصّ قانون أوم على أن التوتر يساوي حاصل ضرب شدة التيار في ...",
          acceptedAnswers: ["المقاومة", "مقاومة الناقل"],
          explanation: "U = R × I، فالتوتر = شدة التيار × المقاومة.",
        },
      });

      // 4) اختيار من متعدد
      const q4 = await tx.question.create({
        data: {
          ...baseQ,
          type: "MULTIPLE_CHOICE",
          content: "أيٌّ من العناصر الآتية يُعدّ موصلاً جيداً للكهرباء؟",
          explanation: "النحاس فلزّ موصل جيّد؛ الخشب والزجاج والمطاط عوازل.",
          options: {
            create: [
              { label: "أ", content: "الخشب", isCorrect: false, orderNum: 1 },
              { label: "ب", content: "النحاس", isCorrect: true, orderNum: 2 },
              { label: "ج", content: "الزجاج", isCorrect: false, orderNum: 3 },
              { label: "د", content: "المطاط", isCorrect: false, orderNum: 4 },
            ],
          },
        },
      });

      // 5) إجابة قصيرة
      const q5 = await tx.question.create({
        data: {
          ...baseQ,
          type: "SHORT_ANSWER",
          content: "ما اسم الجهاز المستخدم لقياس شدة التيار الكهربائي؟",
          acceptedAnswers: ["الأمبيرمتر", "الأميتر", "أمبيرمتر"],
          explanation: "يُقاس التيار بالأمبيرمتر (يُوصَل على التسلسل).",
        },
      });

      // الاختبار (خطّي منشور)
      const quiz = await tx.quiz.create({
        data: {
          creatorId: teacher.id,
          subjectId: subject.id,
          title: SAMPLE_QUIZ_TITLE,
          description: "اختبار تجريبي لتشغيل حلقة الطالب (5 أسئلة).",
          mode: "LINEAR",
          status: "PUBLISHED",
          availableFrom: new Date(),
          settings: {
            timeLimitSec: 600, // 10 دقائق — يُفرَض على الخادم
            maxAttempts: 3,
            revealAnswers: "immediate", // تصحيح فوري بعد كل سؤال
          },
        },
      });

      // العُقد: بداية ← 5 أسئلة ← نهاية، موصولة بحوافّ ALWAYS بالترتيب.
      const startNode = await tx.quizNode.create({
        data: { quizId: quiz.id, nodeType: "START", positionX: 0, positionY: 0 },
      });

      const questions = [q1, q2, q3, q4, q5];
      const questionNodes = [];
      for (let i = 0; i < questions.length; i++) {
        const node = await tx.quizNode.create({
          data: {
            quizId: quiz.id,
            nodeType: "QUESTION",
            questionId: questions[i].id,
            positionX: (i + 1) * 200,
            positionY: 0,
          },
        });
        questionNodes.push(node);
      }

      const endNode = await tx.quizNode.create({
        data: {
          quizId: quiz.id,
          nodeType: "END",
          positionX: (questions.length + 1) * 200,
          positionY: 0,
        },
      });

      const ordered = [startNode, ...questionNodes, endNode];
      for (let i = 0; i < ordered.length - 1; i++) {
        await tx.quizEdge.create({
          data: {
            quizId: quiz.id,
            sourceNodeId: ordered[i].id,
            targetNodeId: ordered[i + 1].id,
            conditionType: "ALWAYS",
            priority: 0,
          },
        });
      }

      await tx.quiz.update({
        where: { id: quiz.id },
        data: { startNodeId: startNode.id },
      });

      // إسناد الاختبار للطالب التجريبي.
      await tx.quizAssignment.create({
        data: {
          quizId: quiz.id,
          studentId: student.id,
          teacherId: teacher.id,
        },
      });
    });
    console.log("  + أُنشئ اختبار تجريبي منشور وأُسنِد للطالب");
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
