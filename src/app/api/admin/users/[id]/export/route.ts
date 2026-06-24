// src/app/api/admin/users/[id]/export/route.ts
// المدير يصدّر «حزمة المدرّس» الكاملة كملفّ JSON للتنزيل (نسخة احتياطية محمولة).
// قراءة فقط. المدير حصراً، بعزل المؤسّسة، للمدرّسين فقط.
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";
import { buildTeacherExport } from "@/lib/teacherExport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getAdminContext();
  if (!ctx) {
    return Response.json({ error: "غير مخوّل" }, { status: 401 });
  }

  const target = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, role: true, schoolId: true },
  });
  if (!target || target.role !== "TEACHER") {
    return Response.json({ error: "المدرّس غير موجود" }, { status: 404 });
  }
  if (ctx.isSchoolManager && target.schoolId !== ctx.schoolId) {
    return Response.json({ error: "المدرّس غير موجود" }, { status: 404 });
  }

  const bundle = await buildTeacherExport(target.id);
  const body = JSON.stringify(bundle);
  const date = new Date().toISOString().slice(0, 10);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="teacher-export-${target.id}-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
