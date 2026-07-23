# Bloom — Project Plan

A personal filter-coffee tool: calculates a 4:6 pour schedule from a dose and ratio, and keeps a log of every brew so the log teaches me something instead of just accumulating.

**Fully static site. No backend, no database, no server process.** Data lives in the browser (IndexedDB) with JSON export/import for backup and portability. Built with Bun, deployed to Coolify as a static site.

---

## 1. Goals

- Enter dose, ratio and a couple of taste preferences → get a pour schedule I can follow at the scale.
- Log the brew afterwards: bean info, grind setting, temp, actual total time, taste scores, one-line verdict.
- Browse and compare past brews.
- Installable on my phone (PWA), fully working offline.
- Data I can export to a real file, back up, and read with my own eyes.

## 2. Non-goals

- Any server-side code
- Accounts, login, multi-user
- Automatic sync between devices (export/import is the manual substitute)
- App store presence
- Brew methods other than 4:6 pour-over (v1)

## 3. Domain logic — the 4:6 method

Tetsu Kasuya's method splits total water into two parts:

- **First 40% — flavour.** Two pours. The *split between them* controls acidity vs. sweetness:
  - smaller first pour → sweeter, rounder
  - larger first pour → brighter, more acidic
- **Last 60% — strength.** The *number of pours* controls body:
  - 1 pour → lighter · 2 → medium · 3 → stronger (Tetsu's recommendation)
  - Always split evenly among themselves.

Canonical baseline (per [Philocoffea](https://en.philocoffea.com/blogs/blog/coffee-brewing-method)): 1:15 ratio, five *equal* pours of 3×dose each, 45s apart — i.e. 50/50 flavour split + 3 strength pours.

Calculator inputs:

| Input | Example | Effect |
|---|---|---|
| Dose (g) | 15 | scale |
| Ratio | 1:15 | total water = dose × ratio |
| Flavour split (first pour %) | 35–65, default 50 | smaller first pour = sweeter, larger = brighter |
| Strength pours | 1, 2 or 3 | how the back 60% divides; more pours = stronger |
| Pour interval | 45s | spacing between pour starts |

Worked example — 15g, 1:15, 40% first pour, 3 strength pours:

```
Total water     225g
First 40%        90g  →  pour 1: 36g @ 0:00
                         pour 2: 54g @ 0:45
Last 60%        135g  →  pour 3: 45g @ 1:30
                         pour 4: 45g @ 2:15
                         pour 5: 45g @ 3:00
```

Output: table of **water added** and **running total** per pour — the running total is what I read off the scale.

Rounding rule: round each pour to the nearest gram, push the remainder into the final pour so the running total lands exactly on target.

Pure arithmetic, no I/O → its own module, tested first with `bun test`.

## 4. Data model & validation

Zod v4 schemas are the **single source of truth**; TS types are inferred from them. The same schema that types the app validates imported JSON — the one place untrusted data enters.

```ts
import { z } from "zod";

const Score = z.int().min(1).max(5);

export const BrewSchema = z.object({
  id: z.uuid(),
  createdAt: z.iso.datetime(),

  // bean
  roaster: z.string(),
  coffeeName: z.string(),
  origin: z.string(),
  process: z.string().optional(),   // washed / natural / anaerobic ...
  roastDate: z.iso.date(),          // days off roast derived, never stored

  // recipe as brewed
  dose: z.number().positive(),      // g
  ratio: z.number().positive(),     // 15 means 1:15
  waterTotal: z.number().positive(),
  grindSetting: z.string(),         // free text — grinders all number differently
  waterTemp: z.number(),            // °C
  flavourSplitFirst: z.int().min(1).max(99), // % of the 40% in pour 1; pour 2 derived
  strengthPours: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  pours: z.array(z.object({
    atSeconds: z.int().nonnegative(),
    added: z.number(),
    runningTotal: z.number(),
  })),

  // result
  totalBrewTime: z.int().positive(), // seconds, actual drawdown finish
  sweetness: Score,
  acidity: Score,
  bitterness: Score,
  body: Score,
  verdict: z.string(),              // "too sour, grind finer next time"
});

export const StoreSchema = z.object({
  version: z.literal(1),
  brews: z.array(BrewSchema),
  lastExportedAt: z.iso.datetime().nullable(),
});

export type Brew = z.infer<typeof BrewSchema>;
export type Store = z.infer<typeof StoreSchema>;
```

Deliberate choices:

- **`grindSetting` is a string.** Clicks, numbers, dots — free text survives changing grinder.
- **The pour schedule is stored, not recalculated.** Old entries always show what was actually poured.
- **`flavourSplitFirst` is a single number.** A `[number, number]` tuple invites `[40, 61]`; the second half is derived.
- **`lastExportedAt` drives the backup nag** (§6).

Derived at display time, never stored: days off roast, ratio string, second flavour pour %, per-pour percentages.

## 5. Storage — IndexedDB via `idb-keyval`

IndexedDB, not localStorage: no 5MB ceiling, far less eviction. `idb-keyval` (~1KB) makes it as easy as localStorage.

- One key holds the whole `Store`. A few hundred brews is trivial data — no object stores per brew, no indexes, no cursors.
- Read once on load into memory; write the whole object back on every change.
- `version` field exists so a future schema change has something to migrate against.

Tradeoff, stated honestly: device-local. Phone brews aren't on the laptop until export/import. Acceptable because I log at the machine while brewing. §12 has the escape route.

## 6. Backup — export / import

**Export** — downloads `bloom-YYYY-MM-DD.json`, the whole `Store`, pretty-printed. Sets `lastExportedAt` on success.

**Import** — file input → `StoreSchema.safeParse` (reject with a readable error, never a half-import) → **merge by `id`**, never overwrite wholesale. Importing an old backup must not delete newer brews. Show a summary: "added 14, already had 32".

**The nag.** Banner when unexported brews exist: *"12 brews since last export."* Quiet under ~5, prominent past ~15.

Import doubles as device transfer: export on phone, AirDrop, import on laptop.

## 7. Stack

| Piece | Choice | Why |
|---|---|---|
| Toolchain | **Bun** | package manager, bundler, dev server, test runner — one tool |
| Language | **TypeScript**, strict | inferred types from Zod schemas |
| UI | **Vanilla TS** | one screen, no routing; small hand-rolled render helpers, no framework machinery |
| Validation | **zod** (v4) | schema = types = import validation |
| Storage | **idb-keyval** | ~1KB IndexedDB wrapper |
| Styling | plain CSS, custom properties | dark/light via `prefers-color-scheme`, no build step needed |

Total runtime dependencies: **2** (`zod`, `idb-keyval`). Dev dependencies: `typescript`, `@types/bun`.

```bash
bun dev          # bun ./src/index.html — dev server, HMR, TS + CSS handled
bun run build    # bun build ./src/index.html --outdir=dist --minify
bun test         # recipe math tests
```

Vite deliberately not used — its value is framework plugins; Bun covers dev + prod here with zero config.

**UI pattern (vanilla, but disciplined):** one in-memory `Store` + a `render(state)` function per section. Events mutate state, persist, re-render. No virtual DOM, no observables — at this size, "re-render the section" is fast and simple.

## 8. Frontend structure

One page, three sections:

1. **Calculate** — inputs, live-updating pour table. Fully usable without saving anything.
2. **Log this brew** — expands from the calculator, pre-filled with the recipe; adds bean fields, taste scores, verdict.
3. **History** — newest first, rows expandable, filter by coffee name. Export/import + backup banner live here.

Later, not v1: brew mode with a running timer highlighting the current pour. The data model already supports it.

## 9. PWA

- `manifest.webmanifest` — name "Bloom", icons (192/512 + maskable), `display: standalone`, theme colour.
- `sw.ts` — compiled by Bun as a separate entry. Strategy that needs **no build-time asset manifest**:
  - **HTML: network-first**, falling back to cache — updates flow naturally.
  - **Hashed assets: cache-first** — immutable by name, safe forever.
- Serve `sw.js` with `Cache-Control: no-cache` so a stale worker can't wedge the app (nginx line in §10).
- HTTPS required — Coolify handles Let's Encrypt automatically.

## 10. Deployment to Coolify

No GitHub Action, no committed build output — Coolify builds.

### Primary: Nixpacks, static output

| Setting | Value |
|---|---|
| Build pack | Nixpacks |
| Is it a static site? | ✅ |
| Base directory | `/` |
| Publish directory | `dist` |
| Install command | `bun install` |
| Build command | `bun run build` |

Nixpacks detects from `package.json`; Bun detection may misfire (npm in the build log). If so, set the commands explicitly — that's the whole fix. Coolify's static strategy serves via `nginx:alpine` with an overridable config — where the `sw.js` header goes.

### Fallback: Dockerfile

If Nixpacks fights Bun, a two-stage Dockerfile is guaranteed:

```dockerfile
FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

```nginx
location = /sw.js {
  add_header Cache-Control "no-cache";
}
```

Connect the repo, redeploy on push to `main`. Nothing stateful on the server — it only ships files.

## 11. Repo layout

```
bloom/
├── package.json
├── tsconfig.json
├── bunfig.toml             # if needed
├── README.md
├── plan.md
├── src/
│   ├── index.html          # bun entrypoint
│   ├── main.ts             # boot: load store, wire sections
│   ├── recipe.ts           # 4:6 calculation — pure, tested
│   ├── recipe.test.ts
│   ├── schema.ts           # Zod schemas + inferred types
│   ├── storage.ts          # idb-keyval read/write, export/import/merge
│   ├── ui/
│   │   ├── calculator.ts
│   │   ├── log-form.ts
│   │   └── history.ts
│   ├── styles.css
│   ├── sw.ts
│   ├── manifest.webmanifest
│   └── icons/
└── dist/                   # gitignored
```

## 12. Build order

1. `recipe.ts` + tests. Verify against hand-calculated examples including the rounding rule.
2. `index.html` + calculator UI. Already a useful tool at this point.
3. **Deploy.** Get Coolify working while the app is trivial and failures are cheap to diagnose.
4. `schema.ts` + `storage.ts` + log form + history list.
5. Export/import + backup banner. Test the round trip: export, clear site data, import, confirm nothing lost.
6. PWA manifest + service worker. Install to phone.

## 13. Later, maybe

- Brew mode with live timer
- Charts: taste scores vs. grind setting, vs. days off roast
- CSV export
- Other methods — needs a `method` discriminator on `Brew`
- **If device-local storage becomes the real limitation:** tiny Bun API + Coolify volume; `storage.ts` swaps IndexedDB for `fetch`, everything else stays. Only when the annoyance is real.
