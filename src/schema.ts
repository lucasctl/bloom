import { z } from "zod";

/** 1–5 taste score */
export const Score = z.int().min(1).max(5);

export const PourSchema = z.object({
  atSeconds: z.int().nonnegative(),
  added: z.number(),
  runningTotal: z.number(),
});

export const BrewSchema = z.object({
  id: z.uuid(),
  createdAt: z.iso.datetime(),

  // bean
  roaster: z.string(),
  coffeeName: z.string(),
  origin: z.string(),
  process: z.string().optional(), // washed / natural / anaerobic ...
  roastDate: z.iso.date().nullable(), // days off roast derived, never stored

  // recipe as brewed
  dose: z.number().positive(), // g
  ratio: z.number().positive(), // 15 means 1:15
  waterTotal: z.number().positive(),
  grindSetting: z.string(), // free text — grinders all number differently
  waterTemp: z.number(), // °C
  flavourSplitFirst: z.int().min(1).max(99), // % of the 40% in pour 1
  strengthPours: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  pours: z.array(PourSchema),

  // result
  totalBrewTime: z.int().positive().nullable(), // seconds, actual drawdown finish
  sweetness: Score,
  acidity: Score,
  bitterness: Score,
  body: Score,
  verdict: z.string(), // "too sour, grind finer next time"
});

export const StoreSchema = z.object({
  version: z.literal(1),
  brews: z.array(BrewSchema),
  lastExportedAt: z.iso.datetime().nullable(),
});

export type Brew = z.infer<typeof BrewSchema>;
export type Store = z.infer<typeof StoreSchema>;

export const EMPTY_STORE: Store = { version: 1, brews: [], lastExportedAt: null };
