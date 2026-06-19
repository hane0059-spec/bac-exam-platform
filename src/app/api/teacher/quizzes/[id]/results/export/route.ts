// src/app/api/teacher/quizzes/[id]/results/export/route.ts
// GET: تصدير نتائج اختبار إلى Excel (المدرّس المالك فقط).
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { getTeacherSession } from "@/lib/teacher";
import { ownedQuiz } from "@/lib/teacherQuiz";
import { formatDateTime } from "@/lib/datetime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = {
  IN_PROGRESS: "قيد الأداء",
  COMPLETED: "مكتمل",
  TIMED_OUT: "انتهى الوقت",
  ABANDONED: "متروك",
};

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getTeacherSession();
  if (!session)
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });

  const quiz = await ownedQuiz(session.sub, params.id);
  if (!quiz)
    return NextResponse.json({ error: "الاختبار غير موجود" }, { status: 404 });

  const sessions = await prisma.examSession.findMany({
    where: { quizId: quiz.id },
    orderBy: [{ student: { firstName: "asc" } }, { startedAt: "desc" }],
    include: {
      student: {
        select: {
          firstName: true,
          lastName: true,
          studentProfile: { select: { studentCode: true } },
        },
      },
    },
  });

  const pending = await prisma.studentAnswer.groupBy({
    by: ["sessionId"],
    where: { sessionId: { in: sessions.map((s) => s.id) }, needsReview: true },
    _count: { _all: true },
  });
  const pendingSet = new Set(pending.map((p) => p.sessionId));

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("النتائج");
  ws.views = [{ rightToLeft: true }];
  ws.addRow([
    "الطالب",
    "رمز الطالب",
    "الحالة",
    "الدرجة",
    "من",
    "النسبة %",
    "المحاولة",
    "الوقت (دقائق)",
    "التاريخ",
  ]);
  ws.getRow(1).font = { bold: true };

  for (const s of sessions) {
    const inProgress = s.status === "IN_PROGRESS";
    const isPending = pendingSet.has(s.id);
    ws.addRow([
      `${s.student.firstName} ${s.student.lastName}`,
      s.student.studentProfile?.studentCode ?? "—",
      isPending
        ? "بانتظار المراجعة"
        : (STATUS[s.status] ?? s.status),
      inProgress || isPending ? "" : Number(s.totalScore),
      inProgress ? "" : Number(s.maxPossibleScore),
      inProgress || isPending ? "" : Number(s.percentage),
      s.attemptNumber,
      Math.round(s.timeSpent / 60),
      s.completedAt ? formatDateTime(s.completedAt) : formatDateTime(s.startedAt),
    ]);
  }
  ws.columns.forEach((c) => (c.width = 18));

  const buf = Buffer.from(await wb.xlsx.writeBuffer());
  const safe = encodeURIComponent(`نتائج-${quiz.title}.xlsx`);
  return new Response(buf, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="results.xlsx"; filename*=UTF-8''${safe}`,
    },
  });
}
