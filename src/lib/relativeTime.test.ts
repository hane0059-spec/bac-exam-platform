import { describe, it, expect } from "vitest";
import { agoArabic } from "./relativeTime";

const MIN = 60 * 1000;
const H = 60 * MIN;

describe("agoArabic", () => {
  it("الآن لأقلّ من دقيقة", () => {
    expect(agoArabic(0)).toBe("الآن");
    expect(agoArabic(59 * 1000)).toBe("الآن");
    expect(agoArabic(-5000)).toBe("الآن");
  });
  it("الدقائق بقواعد العدد", () => {
    expect(agoArabic(1 * MIN)).toBe("منذ دقيقة");
    expect(agoArabic(2 * MIN)).toBe("منذ دقيقتين");
    expect(agoArabic(5 * MIN)).toBe("منذ 5 دقائق");
    expect(agoArabic(10 * MIN)).toBe("منذ 10 دقائق");
    expect(agoArabic(11 * MIN)).toBe("منذ 11 دقيقة");
    expect(agoArabic(40 * MIN)).toBe("منذ 40 دقيقة");
  });
  it("الساعات والأيام", () => {
    expect(agoArabic(60 * MIN)).toBe("منذ ساعة");
    expect(agoArabic(2 * H)).toBe("منذ ساعتين");
    expect(agoArabic(7 * H)).toBe("منذ 7 ساعات");
    expect(agoArabic(12 * H)).toBe("منذ 12 ساعة");
    expect(agoArabic(24 * H)).toBe("منذ يوم");
    expect(agoArabic(48 * H)).toBe("منذ يومين");
    expect(agoArabic(5 * 24 * H)).toBe("منذ 5 أيام");
    expect(agoArabic(15 * 24 * H)).toBe("منذ 15 يوماً");
  });
});
