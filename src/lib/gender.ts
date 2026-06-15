// src/lib/gender.ts
// المخاطبة حسب الجنس — مصدر واحد لكل التسميات المُجنّسة.
import type { Role, Gender } from "./auth";

const ROLE_LABELS: Record<Role, Record<Gender, string>> = {
  ADMIN: { MALE: "مدير", FEMALE: "مديرة" },
  TEACHER: { MALE: "مدرّس", FEMALE: "مدرّسة" },
  STUDENT: { MALE: "طالب", FEMALE: "طالبة" },
};

// مسمّى الدور حسب الجنس: "مدير" / "مديرة" ...
export function roleLabel(role: Role, gender: Gender): string {
  return ROLE_LABELS[role][gender];
}

// "مرحباً بك" / "مرحباً بكِ"
export function welcome(gender: Gender): string {
  return gender === "FEMALE" ? "مرحباً بكِ" : "مرحباً بك";
}

// لاحقة فعل المخاطبة عند الحاجة: "أنتَ" / "أنتِ"
export function you(gender: Gender): string {
  return gender === "FEMALE" ? "أنتِ" : "أنتَ";
}
