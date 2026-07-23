import { calculateRecipe, type RecipeInput } from "../recipe.ts";
import type { Brew } from "../schema.ts";

const SCORES = ["sweetness", "acidity", "bitterness", "body"] as const;

function ratingRow(name: string): string {
  return `
    <div class="flex items-center justify-between">
      <span class="label-text capitalize">${name}</span>
      <div class="rating rating-sm">
        ${[1, 2, 3, 4, 5]
          .map(
            (v) =>
              `<input type="radio" name="${name}" value="${v}" class="mask mask-star-2 bg-primary" ${v === 3 ? "checked" : ""} aria-label="${v}" />`,
          )
          .join("")}
      </div>
    </div>`;
}

/** "3:30" or "210" → seconds, null if empty/invalid */
export function parseBrewTime(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const match = /^(?:(\d+):)?(\d+)$/.exec(trimmed);
  if (!match) return null;
  const [, minutes, rest] = match;
  const seconds = minutes ? Number(minutes) * 60 + Number(rest) : Number(rest);
  return seconds > 0 ? seconds : null;
}

export function mountLogForm(
  root: HTMLElement,
  getInput: () => RecipeInput,
  onSave: (brew: Brew) => void,
): void {
  root.hidden = false;
  root.innerHTML = `
    <details class="collapse collapse-arrow bg-base-200 mt-4">
      <summary class="collapse-title font-semibold">Log this brew</summary>
      <form class="collapse-content flex flex-col gap-4">
        <div class="grid grid-cols-2 gap-4">
          <label class="form-control">
            <span class="label-text pb-1">Roaster</span>
            <input name="roaster" class="input w-full" placeholder="La Cabra" />
          </label>
          <label class="form-control">
            <span class="label-text pb-1">Coffee</span>
            <input name="coffeeName" class="input w-full" placeholder="El Vergel" required />
          </label>
          <label class="form-control">
            <span class="label-text pb-1">Origin</span>
            <input name="origin" class="input w-full" placeholder="Colombia" />
          </label>
          <label class="form-control">
            <span class="label-text pb-1">Process</span>
            <input name="process" class="input w-full" placeholder="washed" />
          </label>
          <label class="form-control">
            <span class="label-text pb-1">Roast date</span>
            <input name="roastDate" type="date" class="input w-full" />
          </label>
          <label class="form-control">
            <span class="label-text pb-1">Grind setting</span>
            <input name="grindSetting" class="input w-full" placeholder="22 clicks" />
          </label>
          <label class="form-control">
            <span class="label-text pb-1">Water temp</span>
            <label class="input w-full">
              <input name="waterTemp" type="number" min="60" max="100" value="93" class="grow" />
              <span class="label">°C</span>
            </label>
          </label>
          <label class="form-control">
            <span class="label-text pb-1">Total brew time</span>
            <input name="totalBrewTime" class="input w-full" placeholder="3:30" pattern="^(\\d+:)?\\d+$" />
          </label>
        </div>

        <div class="flex flex-col gap-2">
          ${SCORES.map(ratingRow).join("")}
        </div>

        <label class="form-control">
          <span class="label-text pb-1">Verdict</span>
          <input name="verdict" class="input w-full" placeholder="too sour — grind finer next time" />
        </label>

        <button type="submit" class="btn btn-primary">Save brew</button>
      </form>
    </details>
  `;

  const details = root.querySelector("details")!;
  const form = root.querySelector("form")!;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const text = (name: string) => String(data.get(name) ?? "").trim();
    const score = (name: string) => Number(data.get(name)) as Brew["sweetness"];

    const input = getInput();
    const { waterTotal, pours } = calculateRecipe(input);

    onSave({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      roaster: text("roaster"),
      coffeeName: text("coffeeName"),
      origin: text("origin"),
      process: text("process") || undefined,
      roastDate: text("roastDate") || null,
      dose: input.dose,
      ratio: input.ratio,
      waterTotal,
      grindSetting: text("grindSetting"),
      waterTemp: Number(data.get("waterTemp")),
      flavourSplitFirst: input.flavourSplitFirst,
      strengthPours: input.strengthPours,
      pours,
      totalBrewTime: parseBrewTime(text("totalBrewTime")),
      sweetness: score("sweetness"),
      acidity: score("acidity"),
      bitterness: score("bitterness"),
      body: score("body"),
      verdict: text("verdict"),
    });

    form.reset();
    details.open = false;
  });
}
