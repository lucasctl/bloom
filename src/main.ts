import { exportStore, importIntoStore, loadStore, saveStore, unexportedCount } from "./storage.ts";
import type { RecipeInput } from "./recipe.ts";
import { mountCalculator } from "./ui/calculator.ts";
import { mountLogForm } from "./ui/log-form.ts";
import { mountHistory } from "./ui/history.ts";

const store = await loadStore();

let currentInput: RecipeInput;
mountCalculator(document.querySelector<HTMLElement>("#calculator")!, (input) => {
  currentInput = input;
});

const history = mountHistory(document.querySelector<HTMLElement>("#history")!, {
  getBrews: () => store.brews,
  getUnexportedCount: () => unexportedCount(store),
  onExport: () => {
    exportStore(store);
    void saveStore(store);
  },
  onImportFile: async (file) => {
    const result = importIntoStore(store, await file.text());
    if (!result.ok) return result.error;
    void saveStore(store);
    return `Added ${result.added}, already had ${result.existing}.`;
  },
});

mountLogForm(
  document.querySelector<HTMLElement>("#log-form")!,
  () => currentInput,
  (brew) => {
    store.brews.push(brew);
    void saveStore(store);
    history.render();
  },
);
