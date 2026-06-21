// vitest.config.ts — اختبارات وحدة لمنطق الخادم (بيئة Node).
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    // يطابق alias "@" في tsconfig كي تعمل استيرادات @/lib/* داخل الاختبارات.
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
