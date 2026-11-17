// حارس: صيغ الكيمياء `\ce{…}` يجب أن تُرسم بلا خطأ بنفس مسار الاستيراد المستعمل في MathText
// (`katex` + `katex/contrib/mhchem`). كان الاستيراد من `katex/dist/contrib/mhchem.js` يسجّل الإضافة على نسخة
// KaTeX أخرى في المتصفّح فتظهر الصيغة نصّاً أحمر (#cc0000).
import { describe, it, expect } from "vitest";
import katex from "katex";
import "katex/contrib/mhchem";

describe("mhchem (\\ce)", () => {
  it("تُرسم المعادلات الكيميائية بلا لون الخطأ", () => {
    for (const tex of ["\\ce{H2O}", "\\ce{H2O + CO2 -> H2CO3}", "\\ce{Na+ + Cl- -> NaCl}", "\\ce{2H2 + O2 <=> 2H2O}"]) {
      const html = katex.renderToString(tex, { throwOnError: false, output: "html" });
      expect(html, tex).not.toContain("#cc0000");
    }
  });
});
