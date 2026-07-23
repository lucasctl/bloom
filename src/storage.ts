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
