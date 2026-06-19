// prisma/demo.ts
// تصفير كامل + بناء عالم تجريبي (مدرسة، مدير، مدرّسون، طلاب، أولياء، أسئلة،
// اختبارات منشورة ورقية وشجرية) + محاكاة كل السيناريوهات وإصدار تقرير.
// تحذير: يحذف كل البيانات. شغّله بـ: npx tsx prisma/demo.ts
import { PrismaClient, Role, Gender, QuestionType } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  computeScore,
  gradeOptionAnswer,
  gradeShortAnswer,
  gradeOrderAnswer,
} from "../src/lib/grading";

const prisma = new PrismaClient();

// ───────── أدوات تقرير ─────────
const checks: { name: string; ok: boolean; detail?: string }[] = [];
function assert(name: string, ok: boolean, detail?: string) {
  checks.push({ name, ok, detail });
}
function year(): string {
  const now = new Date();
  const y = now.getFullYear();
  const start = now.getMonth() >= 7 ? y : y - 1;
  return `${start}-${start + 1}`;
}
const PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]); // ترويسة PNG مصغّرة (بيانات وهمية للتخزين)

const SUBJECTS = [
  { name: "علم الأحياء", code: "BIO", color: "#1F7A63" },
  { name: "الفيزياء", code: "PHYS", color: "#155E4C" },
  { name: "الكيمياء", code: "CHEM", color: "#B6862C" },
  { name: "الرياضيات", code: "MATH", color: "#2563EB" },
  { name: "اللغة العربية", code: "ARABIC", color: "#9333EA" },
  { name: "اللغة الإنجليزية", code: "ENGLISH", color: "#DB2777" },
  { name: "اللغة الفرنسية", code: "FRENCH", color: "#EA580C" },
  { name: "التربية الدينية", code: "RELIGION", color: "#0D9488" },
  { name: "التربية الوطنية", code: "NATIONAL", color: "#64748B" },
];

async function wipe() {
  await prisma.annotation.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.studentAnswer.deleteMany();
  await prisma.examSession.deleteMany();
  await prisma.quizAssignment.deleteMany();
  await prisma.quizEdge.deleteMany();
  await prisma.quizNode.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.questionOption.deleteMany();
  await prisma.questionMatchingPair.deleteMany();
  await prisma.studentConceptPerformance.deleteMany();
  await prisma.question.deleteMany();
  await prisma.parentLink.deleteMany();
  await prisma.concept.deleteMany();
  await prisma.chapter.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.studentEnrollment.deleteMany();
  await prisma.teacherSubject.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.teacherProfile.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.gradeLevel.deleteMany();
  await prisma.user.deleteMany();
  await prisma.school.deleteMany();
  await prisma.appSetting.deleteMany();
}

// بناء اختبار شجري خطّي من قائمة أسئلة، ونشره.
async function buildTreeQuiz(
  teacherId: string,
  subjectId: string,
  title: string,
  questionIds: string[],
  accessCode: string,
  revealAnswers: "immediate" | "end",
) {
  const quiz = await prisma.quiz.create({
    data: {
      creatorId: teacherId,
      subjectId,
      title,
      status: "PUBLISHED",
      accessCode,
      allowCodeJoin: true,
      settings: { timeLimitSec: 1800, maxAttempts: 1, revealAnswers },
    },
  });
  const start = await prisma.quizNode.create({
    data: { quizId: quiz.id, nodeType: "START", positionX: 0 },
  });
  const qNodes = [];
  for (let i = 0; i < questionIds.length; i++) {
    qNodes.push(
      await prisma.quizNode.create({
        data: {
          quizId: quiz.id,
          nodeType: "QUESTION",
          questionId: questionIds[i],
          positionX: (i + 1) * 200,
        },
      }),
    );
  }
  const end = await prisma.quizNode.create({
    data: { quizId: quiz.id, nodeType: "END", positionX: (questionIds.length + 1) * 200 },
  });
  const ordered = [start, ...qNodes, end];
  for (let i = 0; i < ordered.length - 1; i++) {
    await prisma.quizEdge.create({
      data: {
        quizId: quiz.id,
        sourceNodeId: ordered[i].id,
        targetNodeId: ordered[i + 1].id,
        conditionType: "ALWAYS",
      },
    });
  }
  await prisma.quiz.update({
    where: { id: quiz.id },
    data: { startNodeId: start.id },
  });
  const nodeByQuestion = new Map(qNodes.map((n) => [n.questionId!, n.id]));
  return { quizId: quiz.id, nodeByQuestion };
}

async function main() {
  await wipe();

  // ── المدير العام للمنصّة (إدارة المؤسّسات/المواد) ──
  const superAdmin = await prisma.user.create({
    data: {
      email: "admin@example.com",
      passwordHash: await bcrypt.hash("Admin@123", 10),
      role: Role.ADMIN,
      gender: Gender.MALE,
      firstName: "المدير",
      lastName: "العام",
      isSuperAdmin: true,
    },
  });

  // ── الصفّ والمواد (بكالوريا علمي، بلا طلاب مسبقاً) ──
  const grade = await prisma.gradeLevel.create({
    data: { name: "بكالوريا علمي", code: "BAC_SCI", orderNum: 13 },
  });
  const subjects: { id: string; name: string; code: string }[] = [];
  for (const s of SUBJECTS) {
    const subj = await prisma.subject.create({
      data: { name: s.name, code: s.code, color: s.color, gradeLevelId: grade.id },
    });
    subjects.push({ id: subj.id, name: s.name, code: s.code });
  }

  // ── المؤسّسة ومديرها ──
  const school = await prisma.school.create({
    data: { name: "ثانوية النور النموذجية", type: "مدرسة" },
  });
  const schoolAdmin = await prisma.user.create({
    data: {
      email: "mudir@nour.edu",
      passwordHash: await bcrypt.hash("Admin@123", 10),
      role: Role.ADMIN,
      gender: Gender.MALE,
      firstName: "سامر",
      lastName: "المدير",
      schoolId: school.id,
      createdById: superAdmin.id,
    },
  });

  // ── مدرّس لكل مادة ──
  const ay = year();
  const teacherBySubject = new Map<string, string>();
  let tcode = 1001;
  for (const subj of subjects) {
    const t = await prisma.user.create({
      data: {
        email: `t.${subj.code.toLowerCase()}@nour.edu`,
        passwordHash: await bcrypt.hash("Teacher@123", 10),
        role: Role.TEACHER,
        gender: Gender.MALE,
        firstName: "أستاذ",
        lastName: subj.name,
        schoolId: school.id,
        createdById: schoolAdmin.id,
        teacherProfile: { create: { employeeCode: `T-${tcode++}` } },
        teacherSubjects: { create: { subjectId: subj.id, academicYear: ay } },
      },
    });
    teacherBySubject.set(subj.id, t.id);
  }

  // ── ثلاثة طلاب + وليّ لكل طالب ──
  const students: { id: string; name: string; code: string }[] = [];
  const parents: { id: string; childId: string }[] = [];
  for (let i = 1; i <= 3; i++) {
    const st = await prisma.user.create({
      data: {
        passwordHash: await bcrypt.hash("Student@123", 10),
        role: Role.STUDENT,
        gender: i === 2 ? Gender.FEMALE : Gender.MALE,
        firstName: ["زيد", "هدى", "كرم"][i - 1],
        lastName: "الطالب",
        schoolId: school.id,
        createdById: schoolAdmin.id,
        studentProfile: {
          create: {
            studentCode: `S-${1000 + i}`,
            gradeLevelId: grade.id,
            fatherName: "والد " + ["زيد", "هدى", "كرم"][i - 1],
            enrollmentYear: new Date().getFullYear(),
          },
        },
      },
    });
    students.push({ id: st.id, name: `${["زيد", "هدى", "كرم"][i - 1]} الطالب`, code: `S-${1000 + i}` });

    // تسجيل الطالب مع كل مدرّس في مادته (ليتمكّن المدرّس من إسناده).
    for (const subj of subjects) {
      await prisma.studentEnrollment.create({
        data: {
          studentId: st.id,
          teacherId: teacherBySubject.get(subj.id)!,
          subjectId: subj.id,
          academicYear: ay,
        },
      });
    }

    const p = await prisma.user.create({
      data: {
        email: `wali${i}@nour.edu`,
        passwordHash: await bcrypt.hash("Parent@123", 10),
        role: Role.PARENT,
        gender: Gender.MALE,
        firstName: "ولي",
        lastName: `أمر ${["زيد", "هدى", "كرم"][i - 1]}`,
        schoolId: school.id,
        createdById: schoolAdmin.id,
        parentLinks: { create: { studentId: st.id } },
      },
    });
    parents.push({ id: p.id, childId: st.id });
  }

  // ── أسئلة بكل الأنواع المدعومة (اختيار/صح-خطأ/قصيرة/مقالي) ──
  const bio = subjects.find((s) => s.code === "BIO")!;
  const phys = subjects.find((s) => s.code === "PHYS")!;
  const bioT = teacherBySubject.get(bio.id)!;
  const physT = teacherBySubject.get(phys.id)!;
  // مدرّس الأحياء مأذون بإدارة الطلاب (لعرض الحالتين في العالم التجريبي).
  await prisma.teacherProfile.update({
    where: { userId: bioT },
    data: { canManageStudents: true },
  });

  // MCQ
  const qMcq = await prisma.question.create({
    data: {
      creatorId: bioT,
      subjectId: bio.id,
      type: QuestionType.MULTIPLE_CHOICE,
      content: "أيّ مما يلي وحدة بناء الجهاز العصبي؟",
      points: 2,
      explanation: "العصبون هو الوحدة الوظيفية للجهاز العصبي.",
      options: {
        create: [
          { label: "أ", content: "العصبون", isCorrect: true, orderNum: 1 },
          { label: "ب", content: "النفرون", isCorrect: false, orderNum: 2 },
          { label: "ج", content: "الكبيبة", isCorrect: false, orderNum: 3 },
          { label: "د", content: "الأكسون فقط", isCorrect: false, orderNum: 4 },
        ],
      },
    },
    include: { options: true },
  });
  // TRUE/FALSE
  const qTf = await prisma.question.create({
    data: {
      creatorId: bioT,
      subjectId: bio.id,
      type: QuestionType.TRUE_FALSE,
      content: "التشابك العصبي ينقل السيالة في اتجاه واحد.",
      points: 1,
      options: {
        create: [
          { label: "صح", content: "صح", isCorrect: true, orderNum: 1 },
          { label: "خطأ", content: "خطأ", isCorrect: false, orderNum: 2 },
        ],
      },
    },
    include: { options: true },
  });
  // SHORT
  const qShort = await prisma.question.create({
    data: {
      creatorId: bioT,
      subjectId: bio.id,
      type: QuestionType.SHORT_ANSWER,
      content: "ما اسم الهرمون الخافض لسكر الدم؟",
      points: 2,
      acceptedAnswers: ["الأنسولين", "أنسولين"],
    },
  });
  // ESSAY
  const qEssay = await prisma.question.create({
    data: {
      creatorId: bioT,
      subjectId: bio.id,
      type: QuestionType.ESSAY,
      content: "اشرح آلية الفعل المنعكس مع رسم تخطيطي للقوس الانعكاسي.",
      points: 5,
    },
  });
  // فيزياء MCQ + TF
  const qPhys1 = await prisma.question.create({
    data: {
      creatorId: physT,
      subjectId: phys.id,
      type: QuestionType.MULTIPLE_CHOICE,
      content: "وحدة قياس الاستطاعة الكهربائية هي:",
      points: 2,
      options: {
        create: [
          { label: "أ", content: "الواط", isCorrect: true, orderNum: 1 },
          { label: "ب", content: "الفولت", isCorrect: false, orderNum: 2 },
          { label: "ج", content: "الأوم", isCorrect: false, orderNum: 3 },
        ],
      },
    },
    include: { options: true },
  });
  const qPhys2 = await prisma.question.create({
    data: {
      creatorId: physT,
      subjectId: phys.id,
      type: QuestionType.TRUE_FALSE,
      content: "الانعراج ظاهرة تؤكّد الطبيعة الموجية للضوء.",
      points: 1,
      options: {
        create: [
          { label: "صح", content: "صح", isCorrect: true, orderNum: 1 },
          { label: "خطأ", content: "خطأ", isCorrect: false, orderNum: 2 },
        ],
      },
    },
    include: { options: true },
  });

  // ── الاختبارات ──
  const quizAuto = await buildTreeQuiz(
    bioT,
    bio.id,
    "اختبار الأحياء — التصحيح الآلي",
    [qMcq.id, qTf.id, qShort.id],
    "1001",
    "immediate",
  );
  const quizMixed = await buildTreeQuiz(
    bioT,
    bio.id,
    "اختبار الأحياء — مقالي (تصحيح يدوي)",
    [qShort.id, qEssay.id],
    "1002",
    "end",
  );
  const quizPhys = await buildTreeQuiz(
    physT,
    phys.id,
    "اختبار الفيزياء القصير",
    [qPhys1.id, qPhys2.id],
    "1003",
    "immediate",
  );

  // اختبار ورقي/مرفوع (الكيمياء)
  const chem = subjects.find((s) => s.code === "CHEM")!;
  const chemT = teacherBySubject.get(chem.id)!;
  // تفعيل خاصّية الاختبارات الورقية لمدرّس الكيمياء (يفعّلها المدير عند الطلب).
  await prisma.teacherProfile.update({
    where: { userId: chemT },
    data: { canFileExams: true },
  });
  const fileExam = await prisma.quiz.create({
    data: {
      creatorId: chemT,
      subjectId: chem.id,
      title: "اختبار الكيمياء الورقي (رفع صورة)",
      status: "PUBLISHED",
      accessCode: "1004",
      isFileBased: true,
      settings: { maxAttempts: 1, maxScore: 20 },
    },
  });
  await prisma.attachment.create({
    data: {
      kind: "EXAM_FILE",
      mimeType: "image/png",
      sizeBytes: PNG.length,
      data: PNG,
      uploadedById: chemT,
      quizId: fileExam.id,
    },
  });

  // إسناد كل الاختبارات لكل الطلاب + إشعارات الإسناد.
  const allQuizzes = [
    { id: quizAuto.quizId, t: bioT, title: "اختبار الأحياء — التصحيح الآلي" },
    { id: quizMixed.quizId, t: bioT, title: "اختبار الأحياء — مقالي (تصحيح يدوي)" },
    { id: quizPhys.quizId, t: physT, title: "اختبار الفيزياء القصير" },
    { id: fileExam.id, t: chemT, title: "اختبار الكيمياء الورقي (رفع صورة)" },
  ];
  for (const q of allQuizzes) {
    for (const st of students) {
      await prisma.quizAssignment.create({
        data: { quizId: q.id, studentId: st.id, teacherId: q.t },
      });
      await prisma.notification.create({
        data: {
          userId: st.id,
          type: "ASSIGNED",
          message: `أُسنِد إليك اختبار «${q.title}»`,
          linkUrl: `/student/quizzes/${q.id}`,
        },
      });
    }
  }

  // ───────── محاكاة الأداء ─────────

  // سيناريو 1: زيد (student1) يؤدّي اختبار التصحيح الآلي بإجابات كاملة الصواب.
  await simulateTreeAttempt(quizAuto, students[0].id, [
    { q: qMcq, correct: true },
    { q: qTf, correct: true },
    { q: qShort, correct: true },
  ]);
  // سيناريو 2: هدى (student2) تؤدّيه بإجابات بعضها خاطئ.
  await simulateTreeAttempt(quizAuto, students[1].id, [
    { q: qMcq, correct: true },
    { q: qTf, correct: false },
    { q: qShort, correct: false },
  ]);

  // سيناريو 3: زيد يؤدّي الاختبار المقالي (القصير صحيح، المقالي بانتظار التصحيح).
  const mixedSession = await simulateTreeAttempt(quizMixed, students[0].id, [
    { q: qShort, correct: true },
    { q: qEssay, essayPending: true },
  ]);
  const pendingBefore = await prisma.studentAnswer.count({
    where: { sessionId: mixedSession, needsReview: true },
  });
  assert("المقالي يدخل «بانتظار التصحيح»", pendingBefore === 1);

  // المدرّس يصحّح المقالي (4 من 5) ثم يُعاد حساب الدرجة.
  const essayAns = await prisma.studentAnswer.findFirstOrThrow({
    where: { sessionId: mixedSession, questionId: qEssay.id },
  });
  await prisma.studentAnswer.update({
    where: { id: essayAns.id },
    data: { isCorrect: true, scoreEarned: 4, needsReview: false },
  });
  await recomputeTree(mixedSession);
  const mixedAfter = await prisma.examSession.findUniqueOrThrow({
    where: { id: mixedSession },
  });
  // القصير 2/2 + المقالي الجزئي 4/5 = 6 من 7 ≈ 85.71% (دعم الدرجة الجزئية).
  assert(
    "إعادة الحساب تدعم الدرجة الجزئية",
    Math.abs(Number(mixedAfter.percentage) - 85.71) < 0.1,
    `${Number(mixedAfter.percentage)}%`,
  );

  // سيناريو 4: كرم (student3) يؤدّي اختبار الفيزياء.
  await simulateTreeAttempt(quizPhys, students[2].id, [
    { q: qPhys1, correct: true },
    { q: qPhys2, correct: true },
  ]);

  // سيناريو 5: الاختبار الورقي — كرم يرفع صورة ويُرسل، ثم المدرّس يصحّح ويعلّق.
  const fileSession = await prisma.examSession.create({
    data: {
      studentId: students[2].id,
      quizId: fileExam.id,
      status: "IN_PROGRESS",
      attemptNumber: 1,
      pathTaken: [],
    },
  });
  const answerImg = await prisma.attachment.create({
    data: {
      kind: "ANSWER_UPLOAD",
      mimeType: "image/png",
      sizeBytes: PNG.length,
      data: PNG,
      uploadedById: students[2].id,
      sessionId: fileSession.id,
    },
  });
  await prisma.examSession.update({
    where: { id: fileSession.id },
    data: { status: "COMPLETED", needsGrading: true, completedAt: new Date(), maxPossibleScore: 20 },
  });
  const submittedNeedsGrading = (
    await prisma.examSession.findUniqueOrThrow({ where: { id: fileSession.id } })
  ).needsGrading;
  assert("الورقي يدخل «بانتظار التصحيح» بعد الإرسال", submittedNeedsGrading === true);

  // المدرّس يضع تعليقاً (دبّوساً) على الصورة ثم يصحّح.
  await prisma.annotation.create({
    data: { attachmentId: answerImg.id, authorId: chemT, x: 0.4, y: 0.3, text: "أعد صياغة المعادلة" },
  });
  await prisma.examSession.update({
    where: { id: fileSession.id },
    data: { totalScore: 16, maxPossibleScore: 20, percentage: 80, teacherFeedback: "أداء جيّد", needsGrading: false },
  });
  // إشعار الطالب ووليّه عند التصحيح.
  await prisma.notification.create({
    data: { userId: students[2].id, type: "GRADED", message: "تم تصحيح اختبارك «اختبار الكيمياء الورقي» — 80%", linkUrl: `/student/quizzes/${fileExam.id}` },
  });
  const wali3 = parents.find((p) => p.childId === students[2].id)!;
  await prisma.notification.create({
    data: { userId: wali3.id, type: "GRADED", message: "تم تصحيح اختبار كرم الطالب «اختبار الكيمياء الورقي» — 80%", linkUrl: `/parent/students/${students[2].id}` },
  });

  // ───────── تأكيدات ─────────
  const s1 = await prisma.examSession.findFirstOrThrow({
    where: { studentId: students[0].id, quizId: quizAuto.quizId },
  });
  assert("درجة الإجابات الكاملة 100%", Number(s1.percentage) === 100, `${Number(s1.percentage)}%`);

  const s2 = await prisma.examSession.findFirstOrThrow({
    where: { studentId: students[1].id, quizId: quizAuto.quizId },
  });
  // صحيح فقط MCQ (2) من أصل 5 = 40%
  assert("درجة الإجابات الجزئية 40%", Number(s2.percentage) === 40, `${Number(s2.percentage)}%`);

  const fileAfter = await prisma.examSession.findUniqueOrThrow({ where: { id: fileSession.id } });
  assert("تصحيح الورقي: 80% وغير منتظِر", Number(fileAfter.percentage) === 80 && !fileAfter.needsGrading);

  // فحص ملكية وليّ الأمر.
  const ownsOwn = await prisma.parentLink.findFirst({
    where: { parentId: parents[0].id, studentId: parents[0].childId },
  });
  const ownsOther = await prisma.parentLink.findFirst({
    where: { parentId: parents[0].id, studentId: students[1].id },
  });
  assert("وليّ الأمر يملك ابنه فقط", !!ownsOwn && !ownsOther);

  // إشعارات.
  const n1 = await prisma.notification.count({ where: { userId: students[0].id } });
  assert("إشعارات الطالب الأول (إسناد ×4)", n1 >= 4, `${n1}`);
  const np = await prisma.notification.count({ where: { userId: wali3.id, type: "GRADED" } });
  assert("إشعار وليّ الأمر عند التصحيح", np === 1);

  // تحقّق كلمات السر (محاكاة الدخول).
  const okPw = await bcrypt.compare("Student@123", (await prisma.user.findUniqueOrThrow({ where: { id: students[0].id } })).passwordHash);
  assert("تحقّق كلمة سرّ الطالب (دخول)", okPw);

  // رمز الدخول للاختبار موجود (الانضمام بالرمز).
  const codeOk = await prisma.quiz.count({ where: { accessCode: { not: null }, allowCodeJoin: true } });
  assert("رموز انضمام مفعّلة", codeOk >= 1, `${codeOk} اختبار`);

  // سيناريو: إلغاء سؤال صح/خطأ وإعادة حساب جلسة هدى.
  // كانت 2/5=40% (MCQ صحيح فقط)؛ بإلغاء TF: الصالح MCQ+SHORT=4، المكتسب 2 → 50%.
  await prisma.question.update({
    where: { id: qTf.id },
    data: { isCancelled: true },
  });
  await recomputeTree(s2.id);
  const s2recomputed = await prisma.examSession.findUniqueOrThrow({
    where: { id: s2.id },
  });
  assert(
    "إلغاء سؤال يعيد حساب الجلسة (40%→50%)",
    Number(s2recomputed.percentage) === 50,
    `${Number(s2recomputed.percentage)}%`,
  );
  await prisma.question.update({
    where: { id: qTf.id },
    data: { isCancelled: false }, // إعادة لحالة نظيفة للعالم التجريبي
  });
  await recomputeTree(s2.id);

  // سؤال ترتيب (مراحل) — التحقّق من تخزين التسلسل الصحيح بـ orderNum والتصحيح.
  const stages = [
    "المستقبل الحسّي",
    "العصب الحسّي",
    "المركز العصبي",
    "العصب الحركي",
    "العضلة",
  ];
  const qOrder = await prisma.question.create({
    data: {
      creatorId: bioT,
      subjectId: bio.id,
      type: QuestionType.ORDER,
      content: "رتّب مراحل القوس الانعكاسي:",
      points: 3,
      options: {
        create: stages.map((c, i) => ({
          label: `ع${i + 1}`,
          content: c,
          isCorrect: false,
          orderNum: i,
        })),
      },
    },
    include: { options: true },
  });
  const correctSeq = [...qOrder.options]
    .sort((a, b) => a.orderNum - b.orderNum)
    .map((o) => o.content);
  assert(
    "سؤال الترتيب يخزّن التسلسل الصحيح بـ orderNum",
    JSON.stringify(correctSeq) === JSON.stringify(stages),
  );
  const correctIds = [...qOrder.options]
    .sort((a, b) => a.orderNum - b.orderNum)
    .map((o) => o.id);
  assert(
    "تصحيح الترتيب: المطابق صحيح والمعكوس خاطئ",
    gradeOrderAnswer(correctIds, correctIds) &&
      !gradeOrderAnswer(correctIds, [...correctIds].reverse()),
  );

  // إعداد خطّ افتراضي.
  await prisma.appSetting.create({ data: { key: "font", value: "cairo" } });

  await report();
}

// إنشاء جلسة شجرية مكتملة بإجابات محدّدة، وإرجاع sessionId.
async function simulateTreeAttempt(
  quiz: { quizId: string; nodeByQuestion: Map<string, string> },
  studentId: string,
  answers: {
    q: { id: string; type: QuestionType; points: number | unknown; options?: { id: string; isCorrect: boolean }[]; acceptedAnswers?: string[] };
    correct?: boolean;
    essayPending?: boolean;
  }[],
): Promise<string> {
  const session = await prisma.examSession.create({
    data: { studentId, quizId: quiz.quizId, status: "IN_PROGRESS", attemptNumber: 1, pathTaken: [] },
  });
  const scorable: { points: number; isCorrect: boolean }[] = [];
  for (const a of answers) {
    const nodeId = quiz.nodeByQuestion.get(a.q.id)!;
    const points = Number(a.q.points);
    let isCorrect = false;
    let needsReview = false;
    let textAnswer: string | null = null;
    let selectedIds: string[] = [];

    if (a.q.type === "MULTIPLE_CHOICE" || a.q.type === "TRUE_FALSE") {
      const opts = a.q.options ?? [];
      const correctIds = opts.filter((o) => o.isCorrect).map((o) => o.id);
      const wrong = opts.find((o) => !o.isCorrect);
      selectedIds = a.correct ? correctIds : wrong ? [wrong.id] : [];
      isCorrect = gradeOptionAnswer(correctIds, selectedIds);
    } else if (a.q.type === "SHORT_ANSWER") {
      const accepted = a.q.acceptedAnswers ?? [];
      textAnswer = a.correct ? accepted[0] ?? "" : "إجابة خاطئة";
      isCorrect = gradeShortAnswer(accepted, textAnswer);
    } else if (a.q.type === "ESSAY") {
      textAnswer = "إجابة مقالية بحاجة لتصحيح المدرّس.";
      needsReview = !!a.essayPending;
      isCorrect = false;
    }

    await prisma.studentAnswer.create({
      data: {
        sessionId: session.id,
        questionId: a.q.id,
        nodeId,
        textAnswer,
        isCorrect,
        scoreEarned: isCorrect ? points : 0,
        needsReview,
        ...(selectedIds.length
          ? { selectedOptions: { connect: selectedIds.map((id) => ({ id })) } }
          : {}),
      },
    });
    scorable.push({ points, isCorrect });
  }
  const score = computeScore(scorable);
  await prisma.examSession.update({
    where: { id: session.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      totalScore: score.earned,
      maxPossibleScore: score.max,
      percentage: score.percentage,
      currentNodeId: null,
    },
  });
  return session.id;
}

// إعادة حساب درجة جلسة شجرية من إجاباتها الحالية.
async function recomputeTree(sessionId: string) {
  const answers = await prisma.studentAnswer.findMany({
    where: { sessionId },
    include: {
      question: { select: { points: true, isCancelled: true } },
      node: { select: { pointsOverride: true } },
    },
  });
  const score = computeScore(
    answers.map((a) => ({
      points: Number(a.node.pointsOverride ?? a.question.points),
      isCorrect: a.isCorrect,
      earned: Number(a.scoreEarned),
      isCancelled: a.question.isCancelled,
    })),
  );
  await prisma.examSession.update({
    where: { id: sessionId },
    data: { totalScore: score.earned, maxPossibleScore: score.max, percentage: score.percentage },
  });
}

async function report() {
  const [users, sch, subj, q, quizzes, sessions, notes, atts, anns] = await Promise.all([
    prisma.user.groupBy({ by: ["role"], _count: true }),
    prisma.school.count(),
    prisma.subject.count(),
    prisma.question.groupBy({ by: ["type"], _count: true }),
    prisma.quiz.count(),
    prisma.examSession.count(),
    prisma.notification.count(),
    prisma.attachment.count(),
    prisma.annotation.count(),
  ]);

  console.log("\n══════════ تقرير العالم التجريبي ══════════");
  console.log(`مؤسّسات: ${sch} • مواد: ${subj} • اختبارات: ${quizzes} • جلسات: ${sessions}`);
  console.log(`مستخدمون: ${users.map((u) => `${u.role}=${u._count}`).join(" • ")}`);
  console.log(`أسئلة بالأنواع: ${q.map((x) => `${x.type}=${x._count}`).join(" • ")}`);
  console.log(`إشعارات: ${notes} • مرفقات: ${atts} • تعليقات على الصور: ${anns}`);

  console.log("\n── حسابات الدخول ──");
  console.log("المدير العام:   admin@example.com / Admin@123");
  console.log("مدير المدرسة:  mudir@nour.edu / Admin@123");
  console.log("مدرّس (مثال):  t.bio@nour.edu / Teacher@123 (لكل مادة مدرّس t.<code>@nour.edu)");
  console.log("الطلاب:        S-1001 / S-1002 / S-1003 — كلمة السر Student@123 (أو بالاسم)");
  console.log("أولياء الأمور: wali1@nour.edu / wali2 / wali3 — Parent@123");

  console.log("\n── نتائج السيناريوهات (تأكيدات) ──");
  let pass = 0;
  for (const c of checks) {
    console.log(`${c.ok ? "✓" : "✗"} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
    if (c.ok) pass++;
  }
  console.log(`\nالنتيجة: ${pass}/${checks.length} ناجحة`);
  if (pass !== checks.length) process.exitCode = 2;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
