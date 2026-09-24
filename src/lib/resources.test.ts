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
