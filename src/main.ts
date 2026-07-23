import { loadStore, saveStore } from "./storage.ts";
import type { RecipeInput } from "./recipe.ts";
import { mountCalculator } from "./ui/calculator.ts";
import { mountLogForm } from "./ui/log-form.ts";
import { mountHistory } from "./ui/history.ts";

const store = await loadStore();

let currentInput: RecipeInput;
mountCalculator(document.querySelector<HTMLElement>("#calculator")!, (input) => {
  currentInput = input;
});

const history = mountHistory(
  document.querySelector<HTMLElement>("#history")!,
  () => store.brews,
);

mountLogForm(
  document.querySelector<HTMLElement>("#log-form")!,
  () => currentInput,
  (brew) => {
    store.brews.push(brew);
    void saveStore(store);
    history.render();
  },
);
