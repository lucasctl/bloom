import { describe, expect, test } from "bun:test";
import { importIntoStore, unexportedCount } from "./storage.ts";
import type { Brew, Store } from "./schema.ts";

function makeBrew(overrides: Partial<Brew> = {}): Brew {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    roaster: "",
    coffeeName: "Test",
    origin: "",
    roastDate: null,
    dose: 15,
    ratio: 15,
    waterTotal: 225,
    grindSetting: "",
    waterTemp: 93,
    flavourSplitFirst: 50,
    strengthPours: 3,
    pours: [{ atSeconds: 0, added: 45, runningTotal: 45 }],
    totalBrewTime: null,
    sweetness: 3,
    acidity: 3,
    bitterness: 3,
    body: 3,
    verdict: "",
    ...overrides,
  };
}

function makeStore(brews: Brew[] = [], lastExportedAt: string | null = null): Store {
  return { version: 1, brews, lastExportedAt };
}

describe("importIntoStore", () => {
  test("merges by id, never duplicates", () => {
    const shared = makeBrew();
    const fresh = makeBrew();
    const store = makeStore([shared]);
    const backup = makeStore([shared, fresh]);

    const result = importIntoStore(store, JSON.stringify(backup));
    expect(result).toEqual({ ok: true, added: 1, existing: 1 });
    expect(store.brews).toHaveLength(2);
  });

  test("old backup cannot delete newer brews", () => {
    const newer = makeBrew();
    const store = makeStore([newer]);

    const result = importIntoStore(store, JSON.stringify(makeStore()));
    expect(result).toEqual({ ok: true, added: 0, existing: 0 });
    expect(store.brews).toHaveLength(1);
  });

  test("rejects invalid json", () => {
    const store = makeStore();
    expect(importIntoStore(store, "{oops")).toEqual({ ok: false, error: "Not a JSON file." });
  });

  test("rejects valid json that is not a bloom backup", () => {
    const store = makeStore();
    const result = importIntoStore(store, JSON.stringify({ hello: "world" }));
    expect(result.ok).toBe(false);
    expect(store.brews).toHaveLength(0);
  });
});

describe("unexportedCount", () => {
  test("never exported → everything counts", () => {
    expect(unexportedCount(makeStore([makeBrew(), makeBrew()]))).toBe(2);
  });

  test("only brews after the last export count", () => {
    const old = makeBrew({ createdAt: "2026-01-01T00:00:00.000Z" });
    const recent = makeBrew({ createdAt: "2026-07-01T00:00:00.000Z" });
    const store = makeStore([old, recent], "2026-06-01T00:00:00.000Z");
    expect(unexportedCount(store)).toBe(1);
  });
});
