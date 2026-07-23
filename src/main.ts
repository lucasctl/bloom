import { exportStore, importIntoStore, loadStore, saveStore, unexportedCount } from "./storage.ts";
import type { RecipeInput } from "./recipe.ts";
import { mountCalculator } from "./ui/calculator.ts";
import { mountLogForm } from "./ui/log-form.ts";
import { mountHistory } from "./ui/history.ts";

const store = await loadStore();

// hash-based tabs
const views = {
  "#brew": document.querySelector<HTMLElement>("#view-brew")!,
  "#history": document.querySelector<HTMLElement>("#view-history")!,
};
const tabs = document.querySelectorAll<HTMLAnchorElement>("[data-tabs] .tab");

function showView() {
  const hash = location.hash in views ? (location.hash as keyof typeof views) : "#brew";
  for (const [key, el] of Object.entries(views)) el.hidden = key !== hash;
  for (const tab of tabs) tab.classList.toggle("tab-active", tab.hash === hash);
}
window.addEventListener("hashchange", showView);
showView();

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

// offline support — skipped in dev where sw.js isn't served
if ("serviceWorker" in navigator && location.hostname !== "localhost") {
  void navigator.serviceWorker.register("/sw.js");
}

// ask the browser to exempt our storage from automatic eviction
if (navigator.storage?.persist) {
  void navigator.storage.persist();
}
