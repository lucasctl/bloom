import { describe, expect, test } from "bun:test";
import { parseBrewTime } from "./ui/log-form.ts";

describe("parseBrewTime", () => {
  test("m:ss", () => expect(parseBrewTime("3:30")).toBe(210));
  test("plain seconds", () => expect(parseBrewTime("210")).toBe(210));
  test("empty → null", () => expect(parseBrewTime("")).toBeNull());
  test("garbage → null", () => expect(parseBrewTime("abc")).toBeNull());
  test("zero → null", () => expect(parseBrewTime("0")).toBeNull());
});
