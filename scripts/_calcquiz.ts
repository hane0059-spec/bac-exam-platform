import { prisma } from "../src/lib/prisma";
async function main() {
  const tMath = (await prisma.user.findFirst({ where: { email: "t.math@nour.edu" }, select: { id: true } }))!;
  const mathSubj = (await prisma.subject.findFirst({ where: { code: "MATH" }, select: { id: true } }))!;
  const calc = (await prisma.question.findFirst({ where: { type: "CALCULATION", subjectId: mathSubj.id }, select: { id: true, content: true } }))!;
  const student2 = (await prisma.user.findFirst({ where: { email: "student2@nour.edu" }, select: { id: true } }))!;
  // نظّف أي تجربة سابقة بنفس العنوان
  await prisma.quiz.deleteMany({ where: { title: "اختبار الحساب (تجربة)", creatorId: tMath.id } });
  const quiz = await prisma.quiz.create({
    data: { creatorId: tMath.id, subjectId: mathSubj.id, title: "اختبار الحساب (تجربة)", status: "PUBLISHED", settings: { timeLimitSec: 600, maxAttempts: 1, revealAnswers: "end" } },
  });
  await prisma.quizNode.create({ data: { quizId: quiz.id, nodeType: "QUESTION", questionId: calc.id, positionX: 0, positionY: 0 } });
  await prisma.quizAssignment.create({ data: { quizId: quiz.id, studentId: student2.id, teacherId: tMath.id } });
  console.log("✓ اختبار حساب جاهز | quizId:", quiz.id, "| السؤال:", calc.content.slice(0, 50));
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
