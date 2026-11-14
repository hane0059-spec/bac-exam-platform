import { describe, expect, it } from "vitest";
import { purgeConfirmMatches } from "@/lib/teacherPurge";

describe("purgeConfirmMatches", () => {
  it("يطابق الاسم الكامل تماماً", () => {
    expect(purgeConfirmMatches("بتول الشيخ", "بتول", "الشيخ")).toBe(true);
  });
  it("يتجاهل الفراغات الزائدة فقط", () => {
    expect(purgeConfirmMatches("  بتول    الشيخ ", "بتول", "الشيخ")).toBe(true);
  });
  it("يرفض الاسم الجزئي أو الخاطئ أو الفارغ", () => {
    expect(purgeConfirmMatches("بتول", "بتول", "الشيخ")).toBe(false);
    expect(purgeConfirmMatches("بتول الشيخه", "بتول", "الشيخ")).toBe(false);
    expect(purgeConfirmMatches("", "بتول", "الشيخ")).toBe(false);
    expect(purgeConfirmMatches("   ", "", "")).toBe(false);
  });
  it("حسّاس للهمزات (تأكيد حذف لا يُتساهل فيه)", () => {
    expect(purgeConfirmMatches("احمد", "أحمد", "")).toBe(false);
  });
});
