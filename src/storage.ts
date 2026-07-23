import { get, set } from "idb-keyval";
import { EMPTY_STORE, StoreSchema, type Store } from "./schema.ts";

const KEY = "bloom-store";

/** Read the whole store once on app load. Corrupt/missing data → empty store. */
export async function loadStore(): Promise<Store> {
  const raw = await get(KEY);
  if (raw === undefined) return structuredClone(EMPTY_STORE);
  const parsed = StoreSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("bloom: stored data failed validation, starting fresh", parsed.error);
    return structuredClone(EMPTY_STORE);
  }
  return parsed.data;
}

/** Write the whole store back on every change — trivial at this data size. */
export async function saveStore(store: Store): Promise<void> {
  await set(KEY, store);
}

/** Download the store as a pretty-printed, diffable JSON file. */
export function exportStore(store: Store): void {
  const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(blob),
    download: `bloom-${new Date().toISOString().slice(0, 10)}.json`,
  });
  a.click();
  URL.revokeObjectURL(a.href);
  store.lastExportedAt = new Date().toISOString();
}

export type ImportResult =
  | { ok: true; added: number; existing: number }
  | { ok: false; error: string };

/**
 * Merge a backup file into the store by brew id — never overwrite wholesale,
 * so importing an old backup can't delete newer brews.
 */
export function importIntoStore(store: Store, fileText: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(fileText);
  } catch {
    return { ok: false, error: "Not a JSON file." };
  }
  const parsed = StoreSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Not a valid Bloom backup file." };
  }

  const known = new Set(store.brews.map((b) => b.id));
  const incoming = parsed.data.brews.filter((b) => !known.has(b.id));
  store.brews.push(...incoming);
  return { ok: true, added: incoming.length, existing: parsed.data.brews.length - incoming.length };
}

/** Brews created after the last export — drives the backup nag. */
export function unexportedCount(store: Store): number {
  if (store.lastExportedAt === null) return store.brews.length;
  const last = store.lastExportedAt;
  return store.brews.filter((b) => b.createdAt > last).length;
}
