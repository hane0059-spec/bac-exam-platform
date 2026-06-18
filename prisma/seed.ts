// prisma/seed.ts
// تصفير كامل ثمّ بناء أساس «بكالوريا علمي»: المدير العام + الصفّ + موادّه مُشجَّرة.
// تحذير: يحذف كل البيانات. شغّله بـ: npm run db:seed

import { PrismaClient, Role, Gender } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ── بنية مواد بكالوريا علمي (المادة ← وحدة ← فصل ← درس) ──
// المواد العلمية تحوي تشجيراً ابتدائياً قابلاً للتوسيع من المدرّس.
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
          {
            title: "الجهاز العصبي",
            lessons: ["العصبون والسيالة العصبية", "التشابك العصبي", "الفعل المنعكس"],
          },
          {
            title: "التنسيق الهرموني",
            lessons: ["الغدة النخامية والهرمونات", "تنظيم سكر الدم"],
          },
        ],
      },
      {
        title: "التكاثر",
        chapters: [
          { title: "التكاثر عند النبات", lessons: ["التكاثر الجنسي عند مغلفات البذور"] },
          {
            title: "التكاثر البشري",
            lessons: ["الجهاز التناسلي", "التطور الجنيني", "الولادة والإرضاع"],
          },
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
      {
        title: "الموجات",
        chapters: [{ title: "الظواهر الموجية", lessons: ["الانعراج", "التداخل"] }],
      },
      {
        title: "الفيزياء النووية",
        chapters: [{ title: "النشاط الإشعاعي", lessons: ["التفككات النووية", "الانشطار والاندماج"] }],
      },
    ],
  },
  {
    name: "الكيمياء",
    code: "CHEM",
    color: "#B6862C",
    units: [
      {
        title: "الكيمياء العضوية",
        chapters: [{ title: "الكحولات والحموض", lessons: ["الأكسدة", "الأسترة"] }],
      },
      {
        title: "التفاعلات الكيميائية",
        chapters: [{ title: "سرعة التفاعل", lessons: ["العوامل المؤثرة في السرعة"] }],
      },
      {
        title: "الحموض والأسس",
        chapters: [{ title: "التوازنات", lessons: ["pH المحاليل", "المعايرة"] }],
      },
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

async function wipe() {
  // الحذف بترتيب آمن للعلاقات (الأبناء أولاً).
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
}

async function main() {
  await wipe();
  console.log("✓ حُذفت كل البيانات السابقة");

  // المدير العام للمنصّة.
  await prisma.user.create({
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

  // الصفّ: بكالوريا علمي.
  const grade = await prisma.gradeLevel.create({
    data: { name: "بكالوريا علمي", code: "BAC_SCI", orderNum: 13 },
  });

  // المواد وتشجيرها.
  for (const s of SUBJECTS) {
    const subject = await prisma.subject.create({
      data: { name: s.name, code: s.code, color: s.color, gradeLevelId: grade.id },
    });
    for (const u of s.units ?? []) {
      const unit = await prisma.unit.create({
        data: { subjectId: subject.id, title: u.title },
      });
      for (const c of u.chapters) {
        const chapter = await prisma.chapter.create({
          data: { subjectId: subject.id, unitId: unit.id, title: c.title, orderNum: 0 },
        });
        for (const lesson of c.lessons) {
          await prisma.concept.create({
            data: { chapterId: chapter.id, title: lesson },
          });
        }
      }
    }
  }

  console.log("✓ أُنشئ صفّ «بكالوريا علمي» مع موادّه المُشجَّرة");
  console.log(`  المواد: ${SUBJECTS.length}`);
  console.log("  المدير العام: admin@example.com / Admin@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
