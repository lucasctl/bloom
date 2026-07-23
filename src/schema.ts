import * as z from "zod/mini";

/** 1–5 taste score */
export const Score = z.int().check(z.minimum(1), z.maximum(5));

export const PourSchema = z.object({
  atSeconds: z.int().check(z.nonnegative()),
  added: z.number(),
  runningTotal: z.number(),
});

export const BrewSchema = z.object({
  id: z.uuid(),
  createdAt: z.iso.datetime(), // when logged — immutable, drives the backup nag
  brewedAt: z.optional(z.iso.date()), // when brewed, if backdated — wins for display/sort

  // bean
  roaster: z.string(),
  coffeeName: z.string(),
  origin: z.string(),
  process: z.optional(z.string()), // washed / natural / anaerobic ...
  roastDate: z.nullable(z.iso.date()), // days off roast derived, never stored

  // recipe as brewed
  dose: z.number().check(z.positive()), // g
  ratio: z.number().check(z.positive()), // 15 means 1:15
  waterTotal: z.number().check(z.positive()),
  grindSetting: z.string(), // free text — grinders all number differently
  waterTemp: z.number(), // °C
  flavourSplitFirst: z.int().check(z.minimum(1), z.maximum(99)), // % of the 40% in pour 1
  strengthPours: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  pours: z.array(PourSchema),

  // result
  totalBrewTime: z.nullable(z.int().check(z.positive())), // seconds, actual drawdown finish
  sweetness: Score,
  acidity: Score,
  bitterness: Score,
  body: Score,
  verdict: z.string(), // "too sour, grind finer next time"
});

export const StoreSchema = z.object({
  version: z.literal(1),
  brews: z.array(BrewSchema),
  lastExportedAt: z.nullable(z.iso.datetime()),
});

export type Brew = z.infer<typeof BrewSchema>;
export type Store = z.infer<typeof StoreSchema>;

export const EMPTY_STORE: Store = { version: 1, brews: [], lastExportedAt: null };
