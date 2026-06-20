// src/app/(dashboard)/admin/users/[id]/edit/page.tsx
// المدير: تعديل حساب مدرّس/مدير + إعادة كلمة السرّ.
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DashboardShell from "@/components/DashboardShell";
import UserForm, { type UserInitial } from "@/components/admin/UserForm";
import PasswordResetForm from "@/components/PasswordResetForm";
import { getAdminContext } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function EditUserPage({
  params,
}: {
  params: { id: string };
}) {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/login");
  const session = ctx.session;

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      teacherProfile: {
        select: {
          qualification: true,
          canFileExams: true,
          canManageStudents: true,
          isIndependent: true,
          studentLimit: true,
        },
      },
      teacherSubjects: { select: { subjectId: true } },
    },
  });
  if (!user || user.role === "STUDENT") notFound();
  // عزل المؤسّسة: مدير المدرسة يعدّل مستخدمي مؤسّسته فقط.
  if (ctx.isSchoolManager && user.schoolId !== ctx.schoolId) notFound();

  const canManageAdmins = ctx.isSuper;
  if (user.role === "ADMIN" && !canManageAdmins) notFound();

  const subjects = await prisma.subject.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const initial: UserInitial = {
    role: user.role as "TEACHER" | "ADMIN",
    firstName: user.firstName,
    lastName: user.lastName,
    gender: user.gender as "MALE" | "FEMALE",
    email: user.email ?? "",
    isActive: user.isActive,
    qualification: user.teacherProfile?.qualification ?? "",
    subjectIds: user.teacherSubjects.map((t) => t.subjectId),
    canFileExams: user.teacherProfile?.canFileExams ?? false,
    canManageStudents: user.teacherProfile?.canManageStudents ?? false,
    isSuperAdmin: user.isSuperAdmin,
    isIndependent: user.teacherProfile?.isIndependent ?? false,
    studentLimit: user.teacherProfile?.studentLimit ?? null,
  };

  return (
    <DashboardShell session={session}>
      <div className="mb-6">
        <Link href="/admin/users" className="text-sm text-primary hover:underline">
          ← المستخدمون
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">
          تعديل: {user.firstName} {user.lastName}
        </h2>
      </div>
      <div className="space-y-5">
        <UserForm
          mode="edit"
          userId={user.id}
          subjects={subjects}
          initial={initial}
          canManageAdmins={canManageAdmins}
        />
        <PasswordResetForm endpoint={`/api/admin/users/${user.id}/password`} />
      </div>
    </DashboardShell>
  );
}
