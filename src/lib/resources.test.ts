// src/lib/resources.test.ts
import { describe, it, expect } from "vitest";
import { resolveResourceMime, validateResourceBytes, kindOfMime, safeContentDisposition } from "./resources";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]);
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
const ZIP = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);

describe("لوحة إثراء: التحقّق من الملفّات", () => {
  it("يقبل كل نوع بتوقيعه الصحيح", () => {
    expect(validateResourceBytes("image/png", 100, PNG)).toMatchObject({ ok: true, kind: "image" });
    expect(validateResourceBytes("application/pdf", 100, PDF)).toMatchObject({ ok: true, kind: "pdf" });
    const docx = resolveResourceMime("درس.docx", "");
    expect(validateResourceBytes(docx, 100, ZIP)).toMatchObject({ ok: true, kind: "word" });
  });
  it("يرفض امتداداً مزيَّفاً (محتوى لا يطابق النوع)", () => {
    expect(validateResourceBytes("image/png", 100, PDF).ok).toBe(false);
    expect(validateResourceBytes("application/pdf", 100, PNG).ok).toBe(false);
  });
  it("يرفض SVG/HTML/exe وغير المدعوم وحجماً زائداً/فارغاً", () => {
    expect(resolveResourceMime("x.svg", "image/svg+xml")).toBeNull();
    expect(resolveResourceMime("x.html", "text/html")).toBeNull();
    expect(validateResourceBytes(null, 10, PNG).ok).toBe(false);
    expect(validateResourceBytes("image/png", 6 * 1024 * 1024, PNG).ok).toBe(false);
    expect(validateResourceBytes("image/png", 0, PNG).ok).toBe(false);
  });
  it("kindOfMime وContent-Disposition", () => {
    expect(kindOfMime("text/plain", "TEXT")).toBe("text");
    expect(kindOfMime("image/webp")).toBe("image");
    expect(safeContentDisposition("درس.png", "inline")).toMatch(/^inline; filename=/);
  });
});

import { MAX_DOC_BYTES_SUPER, MAX_DOC_BYTES_TEACHER, streamBytes } from "./resources";

describe("حدّ ملفّات المدير العام (30MB)", () => {
  const MB = 1024 * 1024;
  const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
  it("المدرّس: 15MB لـPDF ويُرفَض ما فوقها", () => {
    expect(validateResourceBytes("application/pdf", 15 * MB, pdf)).toMatchObject({ ok: true });
    expect(validateResourceBytes("application/pdf", 16 * MB, pdf)).toMatchObject({ ok: false });
    expect(MAX_DOC_BYTES_TEACHER).toBe(15 * MB);
  });
  it("المدير العام: حتى 30MB ويُرفَض ما فوقها", () => {
    const o = { maxDocBytes: MAX_DOC_BYTES_SUPER };
    expect(validateResourceBytes("application/pdf", 30 * MB, pdf, o)).toMatchObject({ ok: true });
    expect(validateResourceBytes("application/pdf", 30 * MB + 1, pdf, o)).toMatchObject({ ok: false });
    expect(validateResourceBytes("application/msword", 20 * MB, new Uint8Array([0xd0, 0xcf, 0x11, 0xe0]), o)).toMatchObject({ ok: true });
  });
  it("الصور تبقى 5MB حتى للمدير العام", () => {
    const o = { maxDocBytes: MAX_DOC_BYTES_SUPER };
    expect(validateResourceBytes("image/png", 5 * MB, png, o)).toMatchObject({ ok: true });
    expect(validateResourceBytes("image/png", 6 * MB, png, o)).toMatchObject({ ok: false });
  });
  it("streamBytes يعيد البايتات نفسها بالترتيب", async () => {
    const src = new Uint8Array(1_000_003).map((_, i) => i % 251);
    const out = new Uint8Array(await new Response(streamBytes(src, 64 * 1024)).arrayBuffer());
    expect(out.length).toBe(src.length);
    expect(Buffer.compare(Buffer.from(out), Buffer.from(src))).toBe(0);
  });
});
