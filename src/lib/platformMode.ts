// src/lib/platformMode.ts
// وضع المنصّة: "full" (افتراضي) متعدّد المؤسّسات بكل الأدوار،
// أو "solo" مبسّط: مدير منصّة + مدرّسون مستقلّون فقط
// (بلا مدارس/مديري مدارس/أولياء أمور/حقول مخصّصة/استيراد مركزي).
// يُضبَط لكل نشرة عبر متغيّر البيئة NEXT_PUBLIC_PLATFORM_MODE=solo،
// و NEXT_PUBLIC_ ليكون متاحاً على الخادم والمتصفّح معاً (مصدر واحد).
export const SOLO_MODE = process.env.NEXT_PUBLIC_PLATFORM_MODE === "solo";
