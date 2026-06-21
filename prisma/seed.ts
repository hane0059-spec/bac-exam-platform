// prisma/seed.ts
// تصفير كامل ثمّ بناء سيناريو اختبار شامل:
// مؤسّسة + مدير مدرسة + مدرّس لكل مادة (3 مواد بمدرّسَين) + طالبَين في الصفّ الافتراضي،
// مع بيانات تُمرّن كل الميزات: أنواع الأسئلة (+ملء الفراغات)، دورة حياة الاختبار
// (مسودة/منشور/أرشفة/حذف نهائي يُبقي الدرجة)، التصحيح اليدوي، الاعتراض، أرشيف المدرّس
// التلقائي، أرشيف الطالب، الاختبار الورقي، والإشعارات.
// تحذير: يحذف كل البيانات. شغّله بـ: npm run db:seed

import { PrismaClient, Role, Gender } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const YEAR = "2025-2026";
const ENROLL_YEAR = 2025;
// صورة PNG 1×1 (شفافة) لتمرين مرفقات الاختبار الورقي.
const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

// ── بنية مواد بكالوريا علمي (المادة ← وحدة ← فصل ← درس) ──
const SUBJECTS: {
  name: string;
  code: string;
  color: string;
  units?: { title: string; chapters: { title: string; lessons: string[] }[] }[];
}[] = [
  {
    name: "علم الأحياء",
    code: "BIO",
    color: "#1F7A63",
    units: [
      {
        title: "التنسيق العصبي والهرموني",
        chapters: [
          { title: "الجهاز العصبي", lessons: ["العصبون والسيالة العصبية", "التشابك العصبي", "الفعل المنعكس"] },
          { title: "التنسيق الهرموني", lessons: ["الغدة النخامية والهرمونات", "تنظيم سكر الدم"] },
        ],
      },
      {
        title: "التكاثر",
        chapters: [
          { title: "التكاثر عند النبات", lessons: ["التكاثر الجنسي عند مغلفات البذور"] },
          { title: "التكاثر البشري", lessons: ["الجهاز التناسلي", "التطور الجنيني", "الولادة والإرضاع"] },
        ],
      },
      {
        title: "الوراثة",
        chapters: [
          { title: "قوانين مندل", lessons: ["الهجونة الأحادية", "الهجونة الثنائية"] },
          { title: "الوراثة عند الإنسان", lessons: ["الوراثة المرتبطة بالجنس", "شجرة النسب"] },
        ],
      },
    ],
  },
  {
    name: "الفيزياء",
    code: "PHYS",
    color: "#155E4C",
    units: [
      {
        title: "الكهرباء",
        chapters: [
          { title: "التيار المتناوب", lessons: ["الدارة RLC", "الاستطاعة الكهربائية"] },
          { title: "الحقل المغناطيسي", lessons: ["الحث الكهرطيسي"] },
        ],
      },
      { title: "الموجات", chapters: [{ title: "الظواهر الموجية", lessons: ["الانعراج", "التداخل"] }] },
      { title: "الفيزياء النووية", chapters: [{ title: "النشاط الإشعاعي", lessons: ["التفككات النووية", "الانشطار والاندماج"] }] },
    ],
  },
  {
    name: "الكيمياء",
    code: "CHEM",
    color: "#B6862C",
    units: [
      { title: "الكيمياء العضوية", chapters: [{ title: "الكحولات والحموض", lessons: ["الأكسدة", "الأسترة"] }] },
      { title: "التفاعلات الكيميائية", chapters: [{ title: "سرعة التفاعل", lessons: ["العوامل المؤثرة في السرعة"] }] },
      { title: "الحموض والأسس", chapters: [{ title: "التوازنات", lessons: ["pH المحاليل", "المعايرة"] }] },
    ],
  },
  {
    name: "الرياضيات",
    code: "MATH",
    color: "#2563EB",
    units: [
      { title: "التحليل", chapters: [{ title: "النهايات والاستمرار", lessons: ["المشتقات", "التكامل"] }] },
      { title: "الهندسة الفراغية", chapters: [{ title: "الأشعة في الفراغ", lessons: ["الجداء السلمي"] }] },
      { title: "الأعداد المركّبة", chapters: [{ title: "الأعداد المركّبة", lessons: ["الشكل المثلثي"] }] },
    ],
  },
  { name: "اللغة العربية", code: "ARABIC", color: "#9333EA" },
  { name: "اللغة الإنجليزية", code: "ENGLISH", color: "#DB2777" },
  { name: "اللغة الفرنسية", code: "FRENCH", color: "#EA580C" },
  { name: "التربية الدينية", code: "RELIGION", color: "#0D9488" },
  { name: "التربية الوطنية", code: "NATIONAL", color: "#64748B" },
];

// المواد ذات المدرّسَين.
const DUAL = ["BIO", "PHYS", "CHEM"];

async function wipe() {
  await prisma.annotation.deleteMany();
  await prisma.gradeAppeal.deleteMany();
  await prisma.studentAnswer.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.questionReport.deleteMany();
  await prisma.examSession.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.parentLink.deleteMany();
  await prisma.quizAssignment.deleteMany();
  await prisma.quizEdge.deleteMany();
  await prisma.quizNode.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.questionOption.deleteMany();
  await prisma.questionMatchingPair.deleteMany();
  await prisma.studentConceptPerformance.deleteMany();
  await prisma.question.deleteMany();
  await prisma.concept.deleteMany();
  await prisma.chapter.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.studentEnrollment.deleteMany();
  await prisma.teacherSubject.deleteMany();
  await prisma.customFieldDef.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.teacherProfile.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.gradeLevel.deleteMany();
  await prisma.appSetting.deleteMany();
  await prisma.user.deleteMany();
  await prisma.school.deleteMany();
}

const pw = (p: string) => bcrypt.hash(p, 10);

async function main() {
  await wipe();
  console.log("✓ حُذفت كل البيانات السابقة");

  // ── المدير العام للمنصّة (يُبقى للدخول) ──
  await prisma.user.create({
    data: {
      email: "admin@example.com",
      passwordHash: await pw("Admin@123"),
      role: Role.ADMIN,
      gender: Gender.MALE,
      firstName: "المدير",
      lastName: "العام",
      isSuperAdmin: true,
    },
  });

  // ── المؤسّسة ──
  const school = await prisma.school.create({
    data: { name: "ثانوية النور النموذجية", type: "مدرسة" },
  });

  // ── مدير المدرسة ──
  await prisma.user.create({
    data: {
      email: "manager@nour.edu",
      passwordHash: await pw("Admin@123"),
      role: Role.ADMIN,
      gender: Gender.MALE,
      firstName: "مدير",
      lastName: "النور",
      schoolId: school.id,
      isSuperAdmin: false,
    },
  });

  // ── الصفّ الافتراضي + المواد المُشجَّرة ──
  const grade = await prisma.gradeLevel.create({
    data: { name: "بكالوريا علمي", code: "BAC_SCI", orderNum: 13 },
  });

  const subjectByCode = new Map<string, string>();
  for (const s of SUBJECTS) {
    const subject = await prisma.subject.create({
      data: { name: s.name, code: s.code, color: s.color, gradeLevelId: grade.id },
    });
    subjectByCode.set(s.code, subject.id);
    for (const u of s.units ?? []) {
      const unit = await prisma.unit.create({ data: { subjectId: subject.id, title: u.title } });
      for (const c of u.chapters) {
        const chapter = await prisma.chapter.create({
          data: { subjectId: subject.id, unitId: unit.id, title: c.title, orderNum: 0 },
        });
        for (const lesson of c.lessons) {
          await prisma.concept.create({ data: { chapterId: chapter.id, title: lesson } });
        }
      }
    }
  }
  console.log("✓ الصفّ + 9 مواد مُشجَّرة");

  // ── المدرّسون: واحد لكل مادة + مدرّس ثانٍ للمواد الثلاث ──
  const TEACHERS: { code: string; first: string; last: string; gender: Gender; email: string; perms?: boolean }[] = [
    { code: "BIO", first: "أحمد", last: "الأحياء", gender: Gender.MALE, email: "t.bio@nour.edu", perms: true },
    { code: "BIO", first: "سعاد", last: "الأحياء", gender: Gender.FEMALE, email: "t.bio2@nour.edu" },
    { code: "PHYS", first: "خالد", last: "الفيزياء", gender: Gender.MALE, email: "t.phys@nour.edu" },
    { code: "PHYS", first: "ليلى", last: "الفيزياء", gender: Gender.FEMALE, email: "t.phys2@nour.edu" },
    { code: "CHEM", first: "عمر", last: "الكيمياء", gender: Gender.MALE, email: "t.chem@nour.edu" },
    { code: "CHEM", first: "هدى", last: "الكيمياء", gender: Gender.FEMALE, email: "t.chem2@nour.edu" },
    { code: "MATH", first: "يوسف", last: "الرياضيات", gender: Gender.MALE, email: "t.math@nour.edu" },
    { code: "ARABIC", first: "منى", last: "العربية", gender: Gender.FEMALE, email: "t.arabic@nour.edu" },
    { code: "ENGLISH", first: "سارة", last: "الإنجليزية", gender: Gender.FEMALE, email: "t.english@nour.edu" },
    { code: "FRENCH", first: "رامي", last: "الفرنسية", gender: Gender.MALE, email: "t.french@nour.edu" },
    { code: "RELIGION", first: "بلال", last: "الدينية", gender: Gender.MALE, email: "t.religion@nour.edu" },
    { code: "NATIONAL", first: "نور", last: "الوطنية", gender: Gender.FEMALE, email: "t.national@nour.edu" },
  ];

  const teacherIdByEmail = new Map<string, string>();
  let tNum = 1;
  for (const t of TEACHERS) {
    const u = await prisma.user.create({
      data: {
        email: t.email,
        passwordHash: await pw("Teacher@123"),
        role: Role.TEACHER,
        gender: t.gender,
        firstName: t.first,
        lastName: t.last,
        schoolId: school.id,
        teacherProfile: {
          create: {
            employeeCode: `T-${String(tNum).padStart(3, "0")}`,
            canFileExams: t.perms ?? false,
            canManageStudents: t.perms ?? false,
          },
        },
        teacherSubjects: {
          create: { subjectId: subjectByCode.get(t.code)!, academicYear: YEAR },
        },
      },
    });
    teacherIdByEmail.set(t.email, u.id);
    tNum++;
  }
  console.log(`✓ ${TEACHERS.length} مدرّسين (3 مواد بمدرّسَين)`);

  // ── طالبان في الصفّ الافتراضي ──
  const students: { id: string; name: string }[] = [];
  const STUDENTS = [
    { code: "S-1001", first: "محمد", last: "علي", gender: Gender.MALE, email: "student1@nour.edu" },
    { code: "S-1002", first: "فاطمة", last: "حسن", gender: Gender.FEMALE, email: "student2@nour.edu" },
  ];
  for (const s of STUDENTS) {
    const u = await prisma.user.create({
      data: {
        email: s.email,
        passwordHash: await pw("Student@123"),
        role: Role.STUDENT,
        gender: s.gender,
        firstName: s.first,
        lastName: s.last,
        schoolId: school.id,
        createdById: teacherIdByEmail.get("t.bio@nour.edu")!,
        studentProfile: {
          create: { studentCode: s.code, gradeLevelId: grade.id, enrollmentYear: ENROLL_YEAR },
        },
      },
    });
    students.push({ id: u.id, name: `${s.first} ${s.last}` });
  }
  console.log("✓ طالبان في الصفّ الافتراضي");

  // ── تسجيل الطالبَين في المواد الثلاث (مع المدرّس الأول لكلٍّ) ──
  const primaryTeacher: Record<string, string> = {
    BIO: teacherIdByEmail.get("t.bio@nour.edu")!,
    PHYS: teacherIdByEmail.get("t.phys@nour.edu")!,
    CHEM: teacherIdByEmail.get("t.chem@nour.edu")!,
  };
  for (const st of students) {
    for (const code of DUAL) {
      await prisma.studentEnrollment.create({
        data: {
          studentId: st.id,
          teacherId: primaryTeacher[code],
          subjectId: subjectByCode.get(code)!,
          academicYear: YEAR,
        },
      });
    }
  }
  // تسجيل إضافي للطالب الأول مع المدرّسة الثانية للأحياء (لإظهار حالة المدرّسَين).
  await prisma.studentEnrollment.create({
    data: {
      studentId: students[0].id,
      teacherId: teacherIdByEmail.get("t.bio2@nour.edu")!,
      subjectId: subjectByCode.get("BIO")!,
      academicYear: YEAR,
    },
  });
  console.log("✓ تسجيل الطلاب في المواد الثلاث");

  // ════════════════════════════════════════════
  // تمرين الميزات — في مادة علم الأحياء مع المدرّس أحمد
  // ════════════════════════════════════════════
  const bio = subjectByCode.get("BIO")!;
  const ahmad = teacherIdByEmail.get("t.bio@nour.edu")!;
  const s1 = students[0]; // محمد
  const s2 = students[1]; // فاطمة
  const baseSettings = { timeLimitSec: 600, maxAttempts: 1, revealAnswers: "end" };

  // ── بنك أسئلة بكل الأنواع ──
  const mcq = await prisma.question.create({
    data: {
      creatorId: ahmad, subjectId: bio, type: "MULTIPLE_CHOICE",
      content: "ما الوحدة البنيوية والوظيفية للكائن الحي؟", points: 1,
      options: {
        create: [
          { label: "أ", content: "الخلية", isCorrect: true, orderNum: 0 },
          { label: "ب", content: "النسيج", isCorrect: false, orderNum: 1 },
          { label: "ج", content: "العضو", isCorrect: false, orderNum: 2 },
        ],
      },
    },
    include: { options: true },
  });
  const tf = await prisma.question.create({
    data: {
      creatorId: ahmad, subjectId: bio, type: "TRUE_FALSE",
      content: "النواة تحتوي المادة الوراثية.", points: 1,
      options: {
        create: [
          { label: "صح", content: "صح", isCorrect: true, orderNum: 0 },
          { label: "خطأ", content: "خطأ", isCorrect: false, orderNum: 1 },
        ],
      },
    },
    include: { options: true },
  });
  const shortQ = await prisma.question.create({
    data: {
      creatorId: ahmad, subjectId: bio, type: "SHORT_ANSWER",
      content: "ما اسم العضية المسؤولة عن التنفّس الخلوي؟", points: 1,
      acceptedAnswers: ["الميتوكوندريا", "المتقدرة"],
    },
  });
  const essay = await prisma.question.create({
    data: {
      creatorId: ahmad, subjectId: bio, type: "ESSAY",
      content: "اشرح آلية انتقال السيالة العصبية عبر التشابك.", points: 4,
    },
  });
  await prisma.question.create({
    data: {
      creatorId: ahmad, subjectId: bio, type: "ORDER",
      content: "رتّب مراحل الفعل المنعكس.", points: 2,
      options: {
        create: [
          { label: "1", content: "المستقبل الحسّي", isCorrect: false, orderNum: 0 },
          { label: "2", content: "العصب الوارد", isCorrect: false, orderNum: 1 },
          { label: "3", content: "المركز العصبي", isCorrect: false, orderNum: 2 },
          { label: "4", content: "العصب الصادر", isCorrect: false, orderNum: 3 },
          { label: "5", content: "العضو المُنفِّذ", isCorrect: false, orderNum: 4 },
        ],
      },
    },
  });
  const fill = await prisma.question.create({
    data: {
      creatorId: ahmad, subjectId: bio, type: "FILL_BLANK",
      content: "تتكوّن الخلية أساساً من [[ ]] و[[ ]] والنواة.", points: 2,
      options: {
        create: [
          { label: "1", content: "الغشاء الخلوي | الغشاء البلازمي", isCorrect: false, orderNum: 0 },
          { label: "2", content: "السيتوبلازم | الهيولى", isCorrect: false, orderNum: 1 },
        ],
      },
    },
  });
  console.log("✓ بنك أسئلة بكل الأنواع (6)");

  // ── أسئلة المواد العلمية بمعادلات (فيزياء/كيمياء/رياضيات) ──
  const phys = subjectByCode.get("PHYS")!;
  const chem = subjectByCode.get("CHEM")!;
  const math = subjectByCode.get("MATH")!;
  const tPhys = teacherIdByEmail.get("t.phys@nour.edu")!;
  const tChem = teacherIdByEmail.get("t.chem@nour.edu")!;
  const tMath = teacherIdByEmail.get("t.math@nour.edu")!;

  // الفيزياء
  await prisma.question.create({
    data: {
      creatorId: tPhys, subjectId: phys, type: "MULTIPLE_CHOICE",
      content: "أيّ علاقة تعبّر عن قانون نيوتن الثاني؟", points: 1,
      explanation: "القوّة المحصّلة تساوي جداء الكتلة في التسارع: $\\vec{F}=m\\vec{a}$.",
      options: {
        create: [
          { label: "أ", content: "$F = m\\,a$", isCorrect: true, orderNum: 0 },
          { label: "ب", content: "$F = m\\,v$", isCorrect: false, orderNum: 1 },
          { label: "ج", content: "$F = \\dfrac{m}{a}$", isCorrect: false, orderNum: 2 },
        ],
      },
    },
  });
  await prisma.question.create({
    data: {
      creatorId: tPhys, subjectId: phys, type: "CALCULATION",
      content: "جسمٌ كتلته $m = 2\\,\\mathrm{kg}$ يتسارع بـ $a = 3\\,\\mathrm{m/s^2}$. احسب شدّة القوّة $F=ma$ بالنيوتن.",
      points: 2,
      acceptedAnswers: ["6", "0"],
      explanation: "$F = m\\,a = 2 \\times 3 = 6\\,\\mathrm{N}$.",
    },
  });

  // الكيمياء
  await prisma.question.create({
    data: {
      creatorId: tChem, subjectId: chem, type: "MULTIPLE_CHOICE",
      content: "ما المعادلة الموزونة لاحتراق غاز الهيدروجين؟", points: 1,
      explanation: "الموزونة: $\\ce{2H2 + O2 -> 2H2O}$.",
      options: {
        create: [
          { label: "أ", content: "$\\ce{2H2 + O2 -> 2H2O}$", isCorrect: true, orderNum: 0 },
          { label: "ب", content: "$\\ce{H2 + O2 -> H2O}$", isCorrect: false, orderNum: 1 },
          { label: "ج", content: "$\\ce{H2 + O -> H2O}$", isCorrect: false, orderNum: 2 },
        ],
      },
    },
  });
  await prisma.question.create({
    data: {
      creatorId: tChem, subjectId: chem, type: "SHORT_ANSWER",
      content: "اكتب الصيغة الكيميائية لحمض الكبريتيك (بلا تنسيق).",
      points: 1,
      acceptedAnswers: ["H2SO4"],
      explanation: "حمض الكبريتيك: $\\ce{H2SO4}$.",
    },
  });

  // الرياضيات
  await prisma.question.create({
    data: {
      creatorId: tMath, subjectId: math, type: "MULTIPLE_CHOICE",
      content: "ما حلّا المعادلة $x^{2} - 5x + 6 = 0$؟", points: 1,
      explanation: "بالتحليل $ (x-2)(x-3)=0 $ فالحلّان $x=2$ و $x=3$.",
      options: {
        create: [
          { label: "أ", content: "$x = 2 \\;\\text{و}\\; x = 3$", isCorrect: true, orderNum: 0 },
          { label: "ب", content: "$x = -2 \\;\\text{و}\\; x = -3$", isCorrect: false, orderNum: 1 },
          { label: "ج", content: "$x = 1 \\;\\text{و}\\; x = 6$", isCorrect: false, orderNum: 2 },
        ],
      },
    },
  });
  await prisma.question.create({
    data: {
      creatorId: tMath, subjectId: math, type: "CALCULATION",
      content: "احسب قيمة المقدار $\\dfrac{3}{4} + \\dfrac{1}{4}$.",
      points: 1,
      acceptedAnswers: ["1", "0"],
      explanation: "$\\dfrac{3}{4} + \\dfrac{1}{4} = \\dfrac{4}{4} = 1$.",
    },
  });
  console.log("✓ أسئلة علمية بمعادلات (فيزياء/كيمياء/رياضيات)");

  // اربط كل سؤال بأوّل درس في مادته لتفعيل تحليلات تقدّم الطالب (حسب الدرس).
  for (const subjectId of subjectByCode.values()) {
    const c = await prisma.concept.findFirst({
      where: { chapter: { subjectId } },
      select: { id: true },
    });
    if (c) {
      await prisma.question.updateMany({
        where: { subjectId, conceptId: null },
        data: { conceptId: c.id },
      });
    }
  }
  console.log("✓ ربط الأسئلة بالدروس (للتحليلات)");

  // مساعد: عقدة سؤال لكل اختبار.
  async function makeQuiz(opts: {
    title: string; status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    questions: string[]; settings?: object; isFileBased?: boolean; purged?: boolean;
  }) {
    const quiz = await prisma.quiz.create({
      data: {
        creatorId: ahmad, subjectId: bio, title: opts.title, status: opts.status,
        isFileBased: opts.isFileBased ?? false,
        settings: opts.purged ? { ...(opts.settings ?? baseSettings), purged: true } : (opts.settings ?? baseSettings),
      },
    });
    const nodes: { id: string; questionId: string }[] = [];
    for (let i = 0; i < opts.questions.length; i++) {
      const n = await prisma.quizNode.create({
        data: { quizId: quiz.id, nodeType: "QUESTION", questionId: opts.questions[i], positionX: i, positionY: 0 },
      });
      nodes.push({ id: n.id, questionId: opts.questions[i] });
    }
    return { quiz, nodes };
  }
  async function assign(quizId: string, studentId: string, archived = false) {
    return prisma.quizAssignment.create({
      data: { quizId, studentId, teacherId: ahmad, studentArchivedAt: archived ? new Date() : null },
    });
  }

  // ── Q1: تلقائي بالكامل (MCQ+TF+FILL صحيح) — يكتمل للطالبَين → أرشيف المدرّس ──
  const q1 = await makeQuiz({ title: "اختبار سريع: الخلية", status: "PUBLISHED", questions: [mcq.id, tf.id, fill.id] });
  for (const st of [s1, s2]) {
    const sess = await prisma.examSession.create({
      data: {
        studentId: st.id, quizId: q1.quiz.id, status: "COMPLETED", attemptNumber: 1,
        completedAt: new Date(), totalScore: 4, maxPossibleScore: 4, percentage: 100,
      },
    });
    // MCQ صحيح
    await prisma.studentAnswer.create({
      data: {
        sessionId: sess.id, questionId: mcq.id, nodeId: q1.nodes[0].id, isCorrect: true, scoreEarned: 1,
        selectedOptions: { connect: { id: mcq.options.find((o) => o.isCorrect)!.id } },
      },
    });
    // TF صحيح
    await prisma.studentAnswer.create({
      data: {
        sessionId: sess.id, questionId: tf.id, nodeId: q1.nodes[1].id, isCorrect: true, scoreEarned: 1,
        selectedOptions: { connect: { id: tf.options.find((o) => o.isCorrect)!.id } },
      },
    });
    // FILL صحيح بالكامل → needsReview=false (نتيجة فورية)
    await prisma.studentAnswer.create({
      data: {
        sessionId: sess.id, questionId: fill.id, nodeId: q1.nodes[2].id, isCorrect: true, scoreEarned: 2,
        needsReview: false, textAnswer: JSON.stringify(["الغشاء الخلوي", "الهيولى"]),
      },
    });
  }
  await assign(q1.quiz.id, s1.id, true); // الطالب الأول أرشفه عنده
  await assign(q1.quiz.id, s2.id, false);
  console.log("✓ Q1: تلقائي مكتمل (أرشيف المدرّس + أرشفة الطالب الأول)");

  // ── Q2: تصحيح يدويّ (SHORT+ESSAY+FILL) — صُحِّح للطالبَين، فاطمة تعترض ──
  const q2 = await makeQuiz({ title: "اختبار الوحدة الأولى", status: "PUBLISHED", questions: [shortQ.id, essay.id, fill.id] });
  const q2Sessions: Record<string, string> = {};
  for (const st of [s1, s2]) {
    const sess = await prisma.examSession.create({
      data: {
        studentId: st.id, quizId: q2.quiz.id, status: "COMPLETED", attemptNumber: 1,
        completedAt: new Date(), totalScore: 6, maxPossibleScore: 7, percentage: 85.71,
      },
    });
    q2Sessions[st.id] = sess.id;
    await prisma.studentAnswer.create({
      data: { sessionId: sess.id, questionId: shortQ.id, nodeId: q2.nodes[0].id, isCorrect: true, scoreEarned: 1, needsReview: false, textAnswer: "الميتوكوندريا" },
    });
    await prisma.studentAnswer.create({
      data: { sessionId: sess.id, questionId: essay.id, nodeId: q2.nodes[1].id, isCorrect: true, scoreEarned: 3, needsReview: false, textAnswer: "ينطلق الناقل العصبي من الزر المشبكي…" },
    });
    await prisma.studentAnswer.create({
      data: { sessionId: sess.id, questionId: fill.id, nodeId: q2.nodes[2].id, isCorrect: true, scoreEarned: 2, needsReview: false, textAnswer: JSON.stringify(["الغشاء البلازمي", "السيتوبلازم"]) },
    });
  }
  await assign(q2.quiz.id, s1.id);
  await assign(q2.quiz.id, s2.id);
  // اعتراض فاطمة (مفتوح) → يُعيد Q2 إلى «النشطة» عند المدرّس.
  await prisma.gradeAppeal.create({
    data: { sessionId: q2Sessions[s2.id], studentId: s2.id, reason: "أرى أن إجابتي المقالية تستحقّ الدرجة الكاملة." },
  });
  console.log("✓ Q2: تصحيح يدويّ + اعتراض مفتوح من فاطمة");

  // ── Q3: مسودّة ──
  await makeQuiz({ title: "مسودّة اختبار الوراثة", status: "DRAFT", questions: [mcq.id, essay.id] });
  console.log("✓ Q3: مسودّة");

  // ── Q4: مؤرشف (محذوف) وله جلسة ──
  const q4 = await makeQuiz({ title: "اختبار العام الماضي", status: "ARCHIVED", questions: [mcq.id] });
  const q4sess = await prisma.examSession.create({
    data: { studentId: s1.id, quizId: q4.quiz.id, status: "COMPLETED", attemptNumber: 1, completedAt: new Date(), totalScore: 1, maxPossibleScore: 1, percentage: 100 },
  });
  await prisma.studentAnswer.create({
    data: { sessionId: q4sess.id, questionId: mcq.id, nodeId: q4.nodes[0].id, isCorrect: true, scoreEarned: 1, selectedOptions: { connect: { id: mcq.options.find((o) => o.isCorrect)!.id } } },
  });
  await assign(q4.quiz.id, s1.id);
  console.log("✓ Q4: مؤرشف (محذوف)");

  // ── Q5: حُذف محتواه (الدرجة محفوظة) — قشرة + جلسة بلا عُقد/إجابات ──
  const q5 = await prisma.quiz.create({
    data: { creatorId: ahmad, subjectId: bio, title: "اختبار مُسرَّب (حُذف محتواه)", status: "ARCHIVED", settings: { ...baseSettings, purged: true } },
  });
  await prisma.examSession.create({
    data: { studentId: s2.id, quizId: q5.id, status: "COMPLETED", attemptNumber: 1, completedAt: new Date(), totalScore: 3, maxPossibleScore: 5, percentage: 60 },
  });
  await assign(q5.id, s2.id);
  console.log("✓ Q5: حُذف محتواه مع بقاء الدرجة");

  // ── F1: اختبار ورقي — فاطمة سلّمت وصُحِّحت، محمد لم يبدأ ──
  const f1 = await prisma.quiz.create({
    data: { creatorId: ahmad, subjectId: bio, title: "ورقة امتحان نصفي", status: "PUBLISHED", isFileBased: true, settings: { timeLimitSec: 1800, maxScore: 20 } },
  });
  await prisma.attachment.create({
    data: { kind: "EXAM_FILE", mimeType: "image/png", sizeBytes: PNG_1x1.length, data: PNG_1x1, uploadedById: ahmad, quizId: f1.id },
  });
  await assign(f1.id, s1.id);
  await assign(f1.id, s2.id);
  const fSess = await prisma.examSession.create({
    data: { studentId: s2.id, quizId: f1.id, status: "COMPLETED", attemptNumber: 1, completedAt: new Date(), needsGrading: false, totalScore: 16, maxPossibleScore: 20, percentage: 80, teacherFeedback: "إجابة جيّدة، انتبهي لترتيب الخطوات." },
  });
  const ans = await prisma.attachment.create({
    data: { kind: "ANSWER_UPLOAD", mimeType: "image/png", sizeBytes: PNG_1x1.length, data: PNG_1x1, uploadedById: s2.id, sessionId: fSess.id },
  });
  await prisma.annotation.create({
    data: { attachmentId: ans.id, authorId: ahmad, x: 0.5, y: 0.4, text: "أحسنتِ هنا" },
  });
  console.log("✓ F1: اختبار ورقي مُصحَّح (مع تعليق على الصورة)");

  // ── الإشعارات (تمثيلية) ──
  await prisma.notification.createMany({
    data: [
      { userId: ahmad, type: "appeal_opened", message: `اعترض «${s2.name}» على نتيجة «اختبار الوحدة الأولى» — بانتظار مراجعتك.`, linkUrl: "/teacher/appeals" },
      { userId: s1.id, type: "exam_submitted", message: "أنهى اختبار «اختبار سريع: الخلية» (100%).", linkUrl: "/student/quizzes" },
      { userId: s2.id, type: "first_grade", message: "صُحِّحت ورقتك في «ورقة امتحان نصفي».", linkUrl: `/student/quizzes/${f1.id}` },
    ],
  });
  console.log("✓ إشعارات تمثيلية");

  // ── ملخّص ──
  console.log("\n════════ تمّت البذرة ════════");
  console.log("المدير العام:   admin@example.com / Admin@123");
  console.log("مدير المدرسة:   manager@nour.edu / Admin@123");
  console.log("مدرّس (صلاحيات): t.bio@nour.edu / Teacher@123  (ملفّات + إدارة طلاب)");
  console.log("مدرّسة ثانية:    t.bio2@nour.edu / Teacher@123");
  console.log("طالب:           student1@nour.edu / Student@123  (S-1001)");
  console.log("طالبة:          student2@nour.edu / Student@123  (S-1002)");
  console.log("بقيّة المدرّسين: t.<phys|chem|math|arabic|english|french|religion|national>@nour.edu / Teacher@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
