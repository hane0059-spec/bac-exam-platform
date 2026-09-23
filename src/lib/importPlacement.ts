// src/lib/importPlacement.ts
// توزيع الأسئلة المستوردة على شجرة المنهج (وحدة ← فصل ← درس) حسب أسماء الملفّ:
// يطابق الأسماء مع الموجود (تطبيع عربي)، وينشئ الناقص. المخطّط المخطّط نقيّ
// (planPlacement) قابل للاختبار، والتنفيذ (applyPlan) على قاعدة البيانات.
import type { Prisma } from "@prisma/client";
import { normalizeArabic } from "@/lib/grading";

export interface PlaceInput {
  unit?: string;
  chapter?: string;
  lesson?: string;
}
export interface Tree {
  units: { id: string; title: string; orderNum: number }[];
  chapters: { id: string; title: string; unitId: string | null; orderNum: number }[];
  concepts: { id: string; title: string; chapterId: string }[];
}
export interface PlanNode {
  kind: "unit" | "chapter" | "lesson";
  title: string;
  existingId: string | null;
  parent: PlanNode | null;
  newId?: string;
}
export interface PlacementRef {
  chapter: PlanNode | null;
  lesson: PlanNode | null;
}
export interface Plan {
  /** العقد الجديدة فقط بترتيب الإنشاء (الأب قبل الابن). */
  created: PlanNode[];
  refs: PlacementRef[];
  placedCount: number;
}

/** فصل افتراضي حين يُذكر درس/وحدة بلا فصل. */
export const DEFAULT_CHAPTER = "عام";

const norm = (s: string) => normalizeArabic(s).replace(/\s+/g, " ").trim();
const clean = (s?: string) => (s ?? "").replace(/\s+/g, " ").trim();

export function planPlacement(
  places: (PlaceInput | undefined)[],
  tree: Tree,
): Plan {
  const created: PlanNode[] = [];
  const unitNodes = new Map<string, PlanNode>();
  const chapterNodes = new Map<string, PlanNode>();
  const lessonNodes = new Map<string, PlanNode>();

  for (const u of tree.units)
    unitNodes.set(norm(u.title), {
      kind: "unit", title: u.title, existingId: u.id, parent: null,
    });

  const unitKeyOfId = new Map(
    tree.units.map((u) => [u.id, norm(u.title)] as const),
  );
  for (const c of tree.chapters) {
    const uk = c.unitId ? unitKeyOfId.get(c.unitId) ?? "" : "";
    const key = `${uk}|${norm(c.title)}`;
    if (!chapterNodes.has(key))
      chapterNodes.set(key, {
        kind: "chapter", title: c.title, existingId: c.id,
        parent: uk ? unitNodes.get(uk) ?? null : null,
      });
  }
  const chapterKeyOfId = new Map<string, string>();
  for (const [key, node] of chapterNodes) chapterKeyOfId.set(node.existingId!, key);
  for (const co of tree.concepts) {
    const ck = chapterKeyOfId.get(co.chapterId);
    if (ck === undefined) continue;
    const key = `${ck}#${norm(co.title)}`;
    if (!lessonNodes.has(key))
      lessonNodes.set(key, {
        kind: "lesson", title: co.title, existingId: co.id,
        parent: chapterNodes.get(ck) ?? null,
      });
  }

  const refs: PlacementRef[] = [];
  let placedCount = 0;

  for (const p of places) {
    const unitT = clean(p?.unit);
    const lessonT = clean(p?.lesson);
    let chapterT = clean(p?.chapter);
    if (!unitT && !chapterT && !lessonT) {
      refs.push({ chapter: null, lesson: null });
      continue;
    }
    if (!chapterT) chapterT = DEFAULT_CHAPTER;

    // الوحدة
    let unitNode: PlanNode | null = null;
    let uk = "";
    if (unitT) {
      uk = norm(unitT);
      unitNode = unitNodes.get(uk) ?? null;
      if (!unitNode) {
        unitNode = { kind: "unit", title: unitT, existingId: null, parent: null };
        unitNodes.set(uk, unitNode);
        created.push(unitNode);
      }
    }

    // الفصل: بذكر الوحدة يُطابَق داخلها، وبدونها أوّل فصل بالاسم في المادة.
    const ch = norm(chapterT);
    let chKey = `${uk}|${ch}`;
    let chapterNode = chapterNodes.get(chKey) ?? null;
    if (!chapterNode && !unitT) {
      for (const [k, n] of chapterNodes)
        if (k.endsWith(`|${ch}`)) {
          chKey = k;
          chapterNode = n;
          break;
        }
    }
    if (!chapterNode) {
      chapterNode = { kind: "chapter", title: chapterT, existingId: null, parent: unitNode };
      chapterNodes.set(chKey, chapterNode);
      created.push(chapterNode);
    }

    // الدرس
    let lessonNode: PlanNode | null = null;
    if (lessonT) {
      const lKey = `${chKey}#${norm(lessonT)}`;
      lessonNode = lessonNodes.get(lKey) ?? null;
      if (!lessonNode) {
        lessonNode = { kind: "lesson", title: lessonT, existingId: null, parent: chapterNode };
        lessonNodes.set(lKey, lessonNode);
        created.push(lessonNode);
      }
    }
    refs.push({ chapter: chapterNode, lesson: lessonNode });
    placedCount++;
  }

  return { created, refs, placedCount };
}

/** وصف مقروء للعقد الجديدة (للمعاينة). */
export function describeCreated(plan: Plan): string[] {
  return plan.created.map((n) => {
    const label = n.kind === "unit" ? "وحدة" : n.kind === "chapter" ? "فصل" : "درس";
    return n.parent ? `${label}: ${n.title} (ضمن «${n.parent.title}»)` : `${label}: ${n.title}`;
  });
}

const idOf = (n: PlanNode | null) => (n ? n.existingId ?? n.newId ?? null : null);
export const resolvedIds = (ref: PlacementRef) => ({
  chapterId: idOf(ref.chapter),
  conceptId: idOf(ref.lesson),
});

export async function loadTree(
  db: Prisma.TransactionClient,
  subjectId: string,
): Promise<Tree> {
  const [units, chapters] = await Promise.all([
    db.unit.findMany({ where: { subjectId }, select: { id: true, title: true, orderNum: true } }),
    db.chapter.findMany({
      where: { subjectId },
      select: { id: true, title: true, unitId: true, orderNum: true },
    }),
  ]);
  const concepts = chapters.length
    ? await db.concept.findMany({
        where: { chapterId: { in: chapters.map((c) => c.id) } },
        select: { id: true, title: true, chapterId: true },
      })
    : [];
  return { units, chapters, concepts };
}

/** ينشئ العقد الناقصة (وحدات ← فصول ← دروس) ويسجّل معرّفاتها في الخطّة. */
export async function applyPlan(
  db: Prisma.TransactionClient,
  subjectId: string,
  plan: Plan,
  tree: Tree,
): Promise<void> {
  let unitOrder = tree.units.reduce((m, u) => Math.max(m, u.orderNum), 0);
  let chapterOrder = tree.chapters.reduce((m, c) => Math.max(m, c.orderNum), 0);
  for (const n of plan.created) {
    if (n.kind === "unit") {
      const u = await db.unit.create({
        data: { subjectId, title: n.title, orderNum: ++unitOrder },
        select: { id: true },
      });
      n.newId = u.id;
    } else if (n.kind === "chapter") {
      const c = await db.chapter.create({
        data: { subjectId, title: n.title, unitId: idOf(n.parent), orderNum: ++chapterOrder },
        select: { id: true },
      });
      n.newId = c.id;
    } else {
      const co = await db.concept.create({
        data: { chapterId: idOf(n.parent)!, title: n.title },
        select: { id: true },
      });
      n.newId = co.id;
    }
  }
}
