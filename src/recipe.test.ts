import { describe, expect, test } from "bun:test";
import { calculateRecipe } from "./recipe.ts";

describe("calculateRecipe", () => {
  test("canonical Philocoffea example: 20g → five equal 60g pours", () => {
    // https://en.philocoffea.com/blogs/blog/coffee-brewing-method
    const { waterTotal, pours } = calculateRecipe({
      dose: 20,
      ratio: 15,
      flavourSplitFirst: 50,
      strengthPours: 3,
      pourIntervalSeconds: 45,
    });

    expect(waterTotal).toBe(300);
    expect(pours).toEqual([
      { atSeconds: 0, added: 60, runningTotal: 60 },
      { atSeconds: 45, added: 60, runningTotal: 120 },
      { atSeconds: 90, added: 60, runningTotal: 180 },
      { atSeconds: 135, added: 60, runningTotal: 240 },
      { atSeconds: 180, added: 60, runningTotal: 300 },
    ]);
  });

  test("40/60 flavour split: 15g, 1:15, 3 strength pours", () => {
    const { waterTotal, pours } = calculateRecipe({
      dose: 15,
      ratio: 15,
      flavourSplitFirst: 40,
      strengthPours: 3,
      pourIntervalSeconds: 45,
    });

    expect(waterTotal).toBe(225);
    expect(pours).toEqual([
      { atSeconds: 0, added: 36, runningTotal: 36 },
      { atSeconds: 45, added: 54, runningTotal: 90 },
      { atSeconds: 90, added: 45, runningTotal: 135 },
      { atSeconds: 135, added: 45, runningTotal: 180 },
      { atSeconds: 180, added: 45, runningTotal: 225 },
    ]);
  });

  test("rounding remainder lands in the final pour", () => {
    // 13g × 16 = 208g total; 60% = 124.8g over 3 pours = 41.6g each
    const { waterTotal, pours } = calculateRecipe({
      dose: 13,
      ratio: 16,
      flavourSplitFirst: 50,
      strengthPours: 3,
      pourIntervalSeconds: 45,
    });

    expect(waterTotal).toBe(208);
    const last = pours.at(-1)!;
    expect(last.runningTotal).toBe(208);
    expect(pours.reduce((sum, p) => sum + p.added, 0)).toBe(208);
  });

  test("pour count is 2 + strengthPours", () => {
    for (const strengthPours of [1, 2, 3] as const) {
      const { pours } = calculateRecipe({
        dose: 20,
        ratio: 15,
        flavourSplitFirst: 50,
        strengthPours,
        pourIntervalSeconds: 45,
      });
      expect(pours).toHaveLength(2 + strengthPours);
    }
  });

  test("single strength pour delivers the whole 60% at once", () => {
    const { pours } = calculateRecipe({
      dose: 20,
      ratio: 15,
      flavourSplitFirst: 50,
      strengthPours: 1,
      pourIntervalSeconds: 45,
    });
    expect(pours).toHaveLength(3);
    expect(pours[2]!.added).toBe(180);
    expect(pours[2]!.runningTotal).toBe(300);
  });

  test("larger first pour → brighter (60/40 split)", () => {
    const { pours } = calculateRecipe({
      dose: 15,
      ratio: 15,
      flavourSplitFirst: 60,
      strengthPours: 3,
      pourIntervalSeconds: 45,
    });
    expect(pours[0]!.added).toBe(54);
    expect(pours[1]!.added).toBe(36);
  });
});
