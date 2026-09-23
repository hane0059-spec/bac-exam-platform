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

import { planPlacement, describeCreated, DEFAULT_CHAPTER, type Tree } from "./importPlacement";

describe("توزيع الأسئلة على المنهج (planPlacement)", () => {
  const tree: Tree = {
    units: [{ id: "u1", title: "الوحدة الأولى", orderNum: 1 }],
    chapters: [
      { id: "c1", title: "الجهاز العصبي", unitId: "u1", orderNum: 1 },
      { id: "c9", title: "فصل حرّ", unitId: null, orderNum: 2 },
    ],
    concepts: [{ id: "l1", title: "العصبون", chapterId: "c1" }],
  };

  it("يطابق الموجود بتطبيع عربي ولا يكرّر", () => {
    const plan = planPlacement(
      [{ unit: "الوحدة الأولى", chapter: "الجهاز العصبى", lesson: "العَصبون" }],
      tree,
    );
    expect(plan.created).toHaveLength(0);
    expect(plan.refs[0].chapter?.existingId).toBe("c1");
    expect(plan.refs[0].lesson?.existingId).toBe("l1");
  });

  it("ينشئ الناقص مرّةً واحدة لأسئلة متعدّدة بنفس الاسم", () => {
    const p = { unit: "الوحدة الثانية", chapter: "التكاثر", lesson: "الأمشاج" };
    const plan = planPlacement([p, p, { ...p, lesson: "الإخصاب" }], tree);
    expect(describeCreated(plan)).toEqual([
      "وحدة: الوحدة الثانية",
      "فصل: التكاثر (ضمن «الوحدة الثانية»)",
      "درس: الأمشاج (ضمن «التكاثر»)",
      "درس: الإخصاب (ضمن «التكاثر»)",
    ]);
    expect(plan.refs[0].lesson).toBe(plan.refs[1].lesson);
    expect(plan.placedCount).toBe(3);
  });

  it("فصل افتراضي عند ذكر درس فقط، وبلا موضع يبقى null", () => {
    const plan = planPlacement([{ lesson: "درس وحيد" }, undefined, {}], tree);
    expect(plan.refs[0].chapter?.title).toBe(DEFAULT_CHAPTER);
    expect(plan.refs[1]).toEqual({ chapter: null, lesson: null });
    expect(plan.refs[2]).toEqual({ chapter: null, lesson: null });
    expect(plan.placedCount).toBe(1);
  });

  it("فصل بلا ذكر وحدة يُطابَق ضمن أي وحدة", () => {
    const plan = planPlacement([{ chapter: "الجهاز العصبي" }], tree);
    expect(plan.created).toHaveLength(0);
    expect(plan.refs[0].chapter?.existingId).toBe("c1");
  });
});
