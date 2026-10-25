import { describe, it, expect } from "vitest";
import { parseRecipients, GENERAL_TITLES } from "./certificateGeneral";

describe("parseRecipients", () => {
  it("اسم لكل سطر بلا فراغات زائدة ولا تكرار ولا أسطر فارغة", () => {
    expect(parseRecipients("  أحمد   علي \n\nليلى خالد\r\nأحمد علي\n   \nسارة")).toEqual([
      "أحمد علي",
      "ليلى خالد",
      "سارة",
    ]);
  });
  it("يحترم الحدّ الأقصى", () => {
    const raw = Array.from({ length: 300 }, (_, i) => `طالب ${i + 1}`).join("\n");
    expect(parseRecipients(raw)).toHaveLength(200);
    expect(parseRecipients(raw, 5)).toHaveLength(5);
  });
  it("نصّ فارغ ← لا أسماء", () => {
    expect(parseRecipients("")).toEqual([]);
    expect(parseRecipients(" \n ")).toEqual([]);
  });
});

describe("GENERAL_TITLES", () => {
  it("عناوين متنوّعة وغير مكرّرة", () => {
    expect(new Set(GENERAL_TITLES).size).toBe(GENERAL_TITLES.length);
    expect(GENERAL_TITLES).toContain("شهادة شكر وتقدير");
  });
});
