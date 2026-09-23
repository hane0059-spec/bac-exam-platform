// src/lib/importTemplate.test.ts
import { describe, it, expect } from "vitest";
import { normalizeBankJson } from "./questionImport";
import { IMPORT_TEMPLATE, IMPORT_TEMPLATE_JSON, IMPORT_PROMPT } from "./importTemplate";

describe("نموذج الاستيراد الجاهز", () => {
  it("يُستورَد كاملاً بلا أي سؤال مرفوض (٧ أنواع)", () => {
    const r = normalizeBankJson(JSON.parse(IMPORT_TEMPLATE_JSON));
    expect(r.errors).toHaveLength(0);
    expect(r.items).toHaveLength(IMPORT_TEMPLATE.questions.length);
    expect(new Set(r.items.map((i) => i.type)).size).toBe(7);
  });
  it("التعليمات تذكر كل الأنواع السبعة", () => {
    for (const t of ["multiple_choice", "true_false", "ORDER", "MATCH", "CONCEPT_MAP", "DIAGRAM_LABEL", "ESSAY"])
      expect(IMPORT_PROMPT).toContain(t);
  });
});
