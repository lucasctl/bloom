/**
 * Pure 4:6 method arithmetic. No I/O, no DOM.
 */

export type RecipeInput = {
  /** coffee dose in grams */
  dose: number;
  /** 15 means 1:15 */
  ratio: number;
  /** % of the flavour phase (first 40%) in pour 1, e.g. 40 | 50 | 60 */
  flavourSplitFirst: number;
  /** number of pours in the strength phase (last 60%) */
  strengthPours: 2 | 3 | 4;
  /** seconds between pour starts */
  pourIntervalSeconds: number;
};

export type Pour = {
  atSeconds: number;
  added: number;
  runningTotal: number;
};

export type Recipe = {
  waterTotal: number;
  pours: Pour[];
};

/**
 * Compute the pour schedule. Each pour is rounded to the nearest gram;
 * the rounding remainder is pushed into the final pour so the running
 * total lands exactly on target.
 */
export function calculateRecipe(input: RecipeInput): Recipe {
  const { dose, ratio, flavourSplitFirst, strengthPours, pourIntervalSeconds } = input;

  const waterTotal = Math.round(dose * ratio);
  const flavourWater = waterTotal * 0.4;
  const strengthWater = waterTotal * 0.6;

  const targets = [
    flavourWater * (flavourSplitFirst / 100),
    flavourWater * (1 - flavourSplitFirst / 100),
    ...Array.from({ length: strengthPours }, () => strengthWater / strengthPours),
  ];

  const pours: Pour[] = [];
  let runningTotal = 0;
  for (const [i, target] of targets.entries()) {
    const isLast = i === targets.length - 1;
    const added = isLast ? waterTotal - runningTotal : Math.round(target);
    runningTotal += added;
    pours.push({ atSeconds: i * pourIntervalSeconds, added, runningTotal });
  }

  return { waterTotal, pours };
}
