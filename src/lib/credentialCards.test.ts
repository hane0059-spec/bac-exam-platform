import { describe, it, expect } from "vitest";
import {
  buildCredentialCardsHtml,
  chunkCards,
  escapeHtml,
  sortByGroup,
  CARDS_PER_PAGE,
  type CredentialCard,
} from "./credentialCards";

const mk = (n: number, group?: string): CredentialCard => ({
  name: `طالب ${n}`,
  studentCode: `S-${1000 + n}`,
  password: `PW${n}`,
  group,
});
const opts = { brandName: "إتقان", loginUrl: "https://www.itqanexam.com/login?role=STUDENT" };

describe("credentialCards", () => {
  it("يقسّم 8 بطاقات في كل صفحة", () => {
    expect(CARDS_PER_PAGE).toBe(8);
    const pages = chunkCards(Array.from({ length: 19 }, (_, i) => i));
    expect(pages.map((p) => p.length)).toEqual([8, 8, 3]);
  });

  it("يهرب HTML في الأسماء (لا حقن)", () => {
    expect(escapeHtml(`<img src=x onerror="a">&'`)).toBe(
      "&lt;img src=x onerror=&quot;a&quot;&gt;&amp;&#39;"
    );
    const html = buildCredentialCardsHtml([{ ...mk(1), name: "<script>alert(1)</script>" }], opts);
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });

  it("يرتّب حسب المجموعة ويضع بلا مجموعة أخيراً ويحفظ ترتيب الملف داخلها", () => {
    const sorted = sortByGroup([mk(1), mk(2, "ب"), mk(3, "أ"), mk(4, "ب"), mk(5, "أ")]);
    expect(sorted.map((c) => c.name)).toEqual(["طالب 3", "طالب 5", "طالب 2", "طالب 4", "طالب 1"]);
  });

  it("ينتج صفحات بعدد صحيح وQR وبيانات الدخول ورابطاً بلا بروتوكول", () => {
    const html = buildCredentialCardsHtml(Array.from({ length: 9 }, (_, i) => mk(i + 1)), opts);
    expect((html.match(/class="page"/g) ?? []).length).toBe(2);
    expect((html.match(/class="card"/g) ?? []).length).toBe(9);
    expect(html).toContain("صفحة 2 من 2");
    expect(html).toContain("<symbol id=\"qr\"");
    expect((html.match(/<use /g) ?? []).length).toBe(9);
    expect(html.length).toBeLessThan(60000);
    expect(html).toContain("S-1001");
    expect(html).toContain("PW9");
    expect(html).toContain("www.itqanexam.com");
    expect(html).not.toContain(">https://");
    expect(html).toContain("كلمة السرّ مؤقّتة");
    expect(html).toContain("ستُطلب منك كلمة سرّ جديدة عند أول دخول");
  });
});
