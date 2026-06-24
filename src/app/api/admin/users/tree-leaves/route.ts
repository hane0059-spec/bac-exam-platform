// src/app/api/admin/users/tree-leaves/route.ts
// تحميل كسول لعناصر فرعٍ في شجرة المستخدمين: طلاب صفٍّ ما، أو أعضاء مؤسّسة.
// المدير حصراً، بعزل صارم للمؤسّسة (مدير المدرسة مقيَّد بمؤسّسته مهما كانت المعطيات).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { roleLabel } from "@/lib/gender";
import { getAdminContext } from "@/lib/admin";
import type { Role } from "@/lib/auth";
import type { LeafItem } from "@/components/admin/UsersTree";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX = 1000;

export async function GET(req: Request) {
  const ctx = await getAdminContext();
  if (!ctx) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }

  const url = new URL(req.url);
  const kind = url.searchParams.get("kind");
  const schoolTok = url.searchParams.get("school");
  const gradeTok = url.searchParams.get("grade");
  const roleParam = url.searchParams.get("role");

  // عزل المؤسّسة: مدير المدرسة مقيَّد بمؤسّسته دائماً؛ المدير العام يتبع الرمز.
  const schoolFilter: string | null = ctx.isSchoolManager
    ? ctx.schoolId
    : schoolTok === "__none__"
    ? null
    : schoolTok;

  if (kind === "students") {
    const gradeFilter: Prisma.UserWhereInput =
      gradeTok === "__none__"
        ? { studentProfile: { is: null } } // الطلاب بلا ملفّ (لا صفّ)
        : gradeTok
        ? { studentProfile: { gradeLevelId: gradeTok } }
        : {};

    const students = await prisma.user.findMany({
      where: { role: "STUDENT", schoolId: schoolFilter, ...gradeFilter },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: MAX,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        isActive: true,
        studentProfile: { select: { studentCode: true } },
      },
    });

    const leaves: LeafItem[] = students.map((s) => ({
      id: s.id,
      name: `${s.firstName} ${s.lastName}`,
      meta: s.studentProfile?.studentCode ?? undefined,
      inactive: !s.isActive,
      editHref: `/admin/students/${s.id}/edit`,
    }));
    return NextResponse.json({ leaves });
  }

  if (kind === "staff") {
    const roleFilter: Prisma.UserWhereInput["role"] =
      roleParam === "TEACHER" || roleParam === "ADMIN"
        ? (roleParam as Role)
        : { in: ["TEACHER", "ADMIN"] };

    const staff = await prisma.user.findMany({
      where: { role: roleFilter, schoolId: schoolFilter },
      orderBy: [{ role: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
      take: MAX,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        gender: true,
        isActive: true,
        isSuperAdmin: true,
        email: true,
        teacherProfile: { select: { employeeCode: true } },
      },
    });

    const leaves: LeafItem[] = staff.map((u) => {
      const adminScope =
        u.role === "ADMIN" ? (u.isSuperAdmin ? " عام" : " مؤسّسة") : "";
      const meta = [u.teacherProfile?.employeeCode, u.email]
        .filter(Boolean)
        .join(" • ");
      return {
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        badge:
          roleLabel(u.role as Role, u.gender as "MALE" | "FEMALE") + adminScope,
        meta: meta || undefined,
        inactive: !u.isActive,
        editHref: `/admin/users/${u.id}/edit`,
      };
    });
    return NextResponse.json({ leaves });
  }

  return NextResponse.json({ error: "نوع غير صالح" }, { status: 400 });
}
