import { calculateRecipe, type RecipeInput } from "../recipe.ts";

const STRENGTH_OPTIONS = [
  { value: 1, label: "Lighter", hint: "1 pour" },
  { value: 2, label: "Medium", hint: "2 pours" },
  { value: 3, label: "Stronger", hint: "3 pours" },
] as const;

const DEFAULTS: RecipeInput = {
  dose: 15,
  ratio: 15,
  flavourSplitFirst: 50,
  strengthPours: 3,
  pourIntervalSeconds: 45,
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function radioGroup(
  name: string,
  options: readonly { value: number; label: string; hint: string }[],
  selected: number,
): string {
  return options
    .map(
      (o) => `
        <label class="btn grow flex-col gap-0 h-auto py-2 has-checked:btn-primary">
          <input type="radio" name="${name}" value="${o.value}" class="hidden" ${o.value === selected ? "checked" : ""} />
          <span>${o.label}</span>
          <span class="text-xs opacity-60 font-normal">${o.hint}</span>
        </label>`,
    )
    .join("");
}

export function mountCalculator(
  root: HTMLElement,
  onChange?: (input: RecipeInput) => void,
): void {
  const input = { ...DEFAULTS };

  root.innerHTML = `
    <div class="card bg-base-200">
      <div class="card-body gap-6">
        <div class="grid grid-cols-2 gap-4">
          <label class="form-control">
            <span class="label-text pb-1">Dose</span>
            <label class="input w-full">
              <input name="dose" type="number" inputmode="decimal" min="1" step="0.5" value="${input.dose}" class="grow" />
              <span class="label">g</span>
            </label>
          </label>
          <label class="form-control">
            <span class="label-text pb-1">Ratio</span>
            <label class="input w-full">
              <span class="label">1 :</span>
              <input name="ratio" type="number" inputmode="decimal" min="8" max="25" step="0.5" value="${input.ratio}" class="grow" />
            </label>
          </label>
        </div>

        <div>
          <div class="flex items-baseline justify-between">
            <span class="label-text">Flavour — first pour</span>
            <span class="text-sm tabular-nums opacity-70" data-split>${input.flavourSplitFirst} / ${100 - input.flavourSplitFirst}</span>
          </div>
          <input name="flavourSplitFirst" type="range" min="35" max="65" step="5" value="${input.flavourSplitFirst}" class="range range-primary w-full mt-1" />
          <div class="flex justify-between text-xs opacity-60 px-1">
            <span>sweeter · rounder</span>
            <span>brighter · more acidic</span>
          </div>
        </div>

        <div>
          <span class="label-text">Strength — last 60%</span>
          <div class="flex gap-2 pt-1" role="radiogroup">
            ${radioGroup("strengthPours", STRENGTH_OPTIONS, input.strengthPours)}
          </div>
        </div>

        <label class="form-control">
          <span class="label-text pb-1">Pour interval — <span data-interval>${input.pourIntervalSeconds}</span>s</span>
          <input name="pourIntervalSeconds" type="range" min="30" max="60" step="5" value="${input.pourIntervalSeconds}" class="range range-primary" />
        </label>
      </div>
    </div>

    <div class="card bg-base-200 mt-4">
      <div class="card-body">
        <div class="flex items-baseline justify-between">
          <h2 class="card-title">Schedule</h2>
          <span class="text-sm opacity-70" data-total></span>
        </div>
        <div class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr><th>Pour</th><th>At</th><th class="text-right">Add</th><th class="text-right">Scale reads</th></tr>
            </thead>
            <tbody data-schedule></tbody>
          </table>
        </div>
        <div class="flex gap-4 text-xs opacity-70 sm:hidden">
          <span><span aria-hidden="true" class="status status-warning"></span> flavour</span>
          <span><span aria-hidden="true" class="status status-info"></span> strength</span>
        </div>
      </div>
    </div>
  `;

  const scheduleBody = root.querySelector("[data-schedule]")!;
  const totalEl = root.querySelector("[data-total]")!;
  const intervalEl = root.querySelector("[data-interval]")!;
  const splitEl = root.querySelector("[data-split]")!;

  function render() {
    const { waterTotal, pours } = calculateRecipe(input);
    totalEl.textContent = `${input.dose}g coffee · ${waterTotal}g water`;
    scheduleBody.innerHTML = pours
      .map(
        (p, i) => `
          <tr>
            <td class="font-bold tabular-nums whitespace-nowrap"><span aria-hidden="true" class="status ${i < 2 ? "status-warning" : "status-info"} sm:hidden mr-1"></span>${i + 1}<span class="badge badge-soft badge-sm ml-2 hidden sm:inline-flex ${i < 2 ? "badge-warning" : "badge-info"}">${i < 2 ? "flavour" : "strength"}</span></td>
            <td class="tabular-nums">${formatTime(p.atSeconds)}</td>
            <td class="text-right tabular-nums">+${p.added}g</td>
            <td class="text-right tabular-nums font-bold">${p.runningTotal}g</td>
          </tr>`,
      )
      .join("");
    onChange?.({ ...input });
  }

  root.addEventListener("input", (e) => {
    const el = e.target as HTMLInputElement;
    const value = Number(el.value);
    if (!el.name || Number.isNaN(value)) return;

    switch (el.name) {
      case "dose":
        if (value > 0) input.dose = value;
        break;
      case "ratio":
        if (value > 0) input.ratio = value;
        break;
      case "flavourSplitFirst":
        input.flavourSplitFirst = value;
        splitEl.textContent = `${value} / ${100 - value}`;
        break;
      case "strengthPours":
        if (value === 1 || value === 2 || value === 3) input.strengthPours = value;
        break;
      case "pourIntervalSeconds":
        input.pourIntervalSeconds = value;
        intervalEl.textContent = String(value);
        break;
    }
    render();
  });

  render();
}
