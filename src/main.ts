import { calculateRecipe } from "./recipe.ts";

// Placeholder boot — calculator UI is next (plan.md §12, step 2).
const recipe = calculateRecipe({
  dose: 15,
  ratio: 15,
  flavourSplitFirst: 40,
  strengthPours: 3,
  pourIntervalSeconds: 45,
});

document.querySelector("#calculator")!.textContent = JSON.stringify(recipe, null, 2);
