import { describe, expect, it } from "vitest";
import { ACTIVITY_RANGES, DEFAULT_ACTIVITY_RANGE, parseActivityRange } from "@/lib/activityRange";

describe("parseActivityRange", () => {
  it("يعيد الفترة المطلوبة", () => {
    expect(parseActivityRange("7d").key).toBe("7d");
    expect(parseActivityRange(["30d", "7d"]).key).toBe("30d");
  });
  it("قيمة مجهولة أو غائبة ← الافتراضي", () => {
    expect(parseActivityRange("x").key).toBe(DEFAULT_ACTIVITY_RANGE);
    expect(parseActivityRange(undefined).key).toBe(DEFAULT_ACTIVITY_RANGE);
  });
  it("الفترات مرتّبة تصاعدياً", () => {
    const ms = ACTIVITY_RANGES.map((r) => r.ms);
    expect([...ms].sort((a, b) => a - b)).toEqual(ms);
  });
});

import { activityHref, parseRoleFilter, searchTokens } from "@/lib/activityRange";

describe("تصفية النشاط", () => {
  it("الدور المجهول ← الكل", () => {
    expect(parseRoleFilter("STUDENT")).toBe("STUDENT");
    expect(parseRoleFilter("HACK")).toBe("ALL");
    expect(parseRoleFilter(undefined)).toBe("ALL");
  });
  it("كلمات البحث محدودة ومقصوصة", () => {
    expect(searchTokens("  محمد   الحمود ")).toEqual(["محمد", "الحمود"]);
    expect(searchTokens(undefined)).toEqual([]);
    expect(searchTokens("a b c d e f g h")).toHaveLength(6);
    expect(searchTokens("x".repeat(500))[0]).toHaveLength(60);
  });
  it("الرابط يحفظ الفترة ويحذف الافتراضيات", () => {
    expect(activityHref({ range: "7d", role: "ALL", q: "" })).toBe("/admin/activity?range=7d");
    expect(activityHref({ range: "7d", role: "STUDENT", q: " يحيى " })).toBe(
      `/admin/activity?range=7d&role=STUDENT&q=${encodeURIComponent("يحيى")}`
    );
  });
});
