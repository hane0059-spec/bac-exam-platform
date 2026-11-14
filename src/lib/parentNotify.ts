// src/lib/parentNotify.ts
// إشعار أولياء أمور طلاب بحدث يخصّ أبناءهم (إسناد اختبار، إنهاؤه، اعتماد نتيجته…).
// لا يرمي أبداً: فشل الإشعار لا يجوز أن يكسر العملية الأصلية (إسناد/تسليم/تصحيح).
// الخصوصية: نصّ الإشعار الداخلي يحمل اسم الابن (يراه الوليّ فقط في الموقع)، وعنوان إشعار الهاتف عامّ بلا اسم/درجة
// (انظر PUSH_BODY_BY_TYPE في pushPayload.ts). لكل وليّ إشعار عن كل ابن له.
import { prisma } from "@/lib/prisma";
import { createNotifications } from "@/lib/notifications";

export interface ParentNotice {
  type: string;
  message: string;
  linkUrl: string;
}

/** أنواع إشعارات الأولياء المتعلّقة بالأبناء (لعناوين الدفع العامّة). */
export const PARENT_CHILD_TYPES = ["CHILD_ASSIGNED", "CHILD_SUBMITTED", "CHILD_RESULT"] as const;

/** رابط صفحة الابن عند الوليّ. */
export const parentChildUrl = (studentId: string) => `/parent/students/${studentId}`;

/**
 * يرسل لكل وليّ (فعّال) مرتبط بأيٍّ من `studentIds` إشعاراً يبنيه `build(childName, studentId)`.
 * لا يفعل شيئاً إن لم يكن لهم أولياء.
 */
export async function notifyParentsOf(
  studentIds: string[],
  build: (childName: string, studentId: string) => ParentNotice,
): Promise<void> {
  if (studentIds.length === 0) return;
  try {
    const links = await prisma.parentLink.findMany({
      where: { studentId: { in: studentIds }, parent: { isActive: true } },
      select: {
        parentId: true,
        studentId: true,
        student: { select: { firstName: true, lastName: true } },
      },
    });
    if (links.length === 0) return;
    await createNotifications(
      links.map((l) => {
        const n = build(`${l.student.firstName} ${l.student.lastName}`.trim(), l.studentId);
        return { userId: l.parentId, type: n.type, message: n.message, linkUrl: n.linkUrl };
      }),
    );
  } catch {
    // تجاهل: الإشعار تحسين لا يكسر العملية الأصلية.
  }
}
