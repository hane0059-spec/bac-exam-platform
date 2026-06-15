// src/lib/datetime.ts
// تنسيق تاريخ/وقت ثابت وواضح (يوم/شهر/سنة + 24 ساعة) بأرقام لاتينية.
// يُعرَض داخل <bdi dir="ltr"> لتفادي انعكاس الأرقام في سياق RTL.
export function formatDateTime(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(
    d.getHours()
  )}:${p(d.getMinutes())}`;
}
