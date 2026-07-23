import type { Brew } from "../schema.ts";

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function daysOffRoast(brew: Brew): number | null {
  if (!brew.roastDate) return null;
  const ms = new Date(brew.createdAt).getTime() - new Date(brew.roastDate).getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

function scoreBar(label: string, value: number): string {
  return `
    <div class="flex items-center gap-2">
      <span class="w-20 text-xs opacity-70 capitalize">${label}</span>
      <progress class="progress progress-primary w-32" value="${value}" max="5"></progress>
      <span class="text-xs tabular-nums">${value}</span>
    </div>`;
}

function brewCard(brew: Brew): string {
  const date = new Date(brew.createdAt).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
  const days = daysOffRoast(brew);

  return `
    <details class="collapse collapse-arrow bg-base-200">
      <summary class="collapse-title py-3">
        <div class="flex items-baseline justify-between gap-2">
          <span class="font-semibold truncate">${escapeHtml(brew.coffeeName) || "Unnamed"}</span>
          <span class="text-xs opacity-60 whitespace-nowrap">${date}</span>
        </div>
        <div class="text-xs opacity-70 truncate">
          ${brew.dose}g · 1:${brew.ratio} · ${escapeHtml(brew.grindSetting)}${brew.verdict ? ` — ${escapeHtml(brew.verdict)}` : ""}
        </div>
      </summary>
      <div class="collapse-content text-sm flex flex-col gap-3">
        <div class="opacity-80">
          ${[escapeHtml(brew.roaster), escapeHtml(brew.origin), brew.process ? escapeHtml(brew.process) : "", days !== null ? `${days} days off roast` : ""].filter(Boolean).join(" · ") || "no bean info"}
        </div>
        <div class="opacity-80">
          ${brew.waterTotal}g water · ${brew.waterTemp}°C · split ${brew.flavourSplitFirst}/${100 - brew.flavourSplitFirst} · ${brew.strengthPours} strength pour${brew.strengthPours > 1 ? "s" : ""}${brew.totalBrewTime ? ` · finished ${formatTime(brew.totalBrewTime)}` : ""}
        </div>
        <div class="flex flex-col gap-1">
          ${scoreBar("sweetness", brew.sweetness)}
          ${scoreBar("acidity", brew.acidity)}
          ${scoreBar("bitterness", brew.bitterness)}
          ${scoreBar("body", brew.body)}
        </div>
        <table class="table table-xs">
          <thead><tr><th>Pour</th><th>At</th><th class="text-right">Add</th><th class="text-right">Total</th></tr></thead>
          <tbody>
            ${brew.pours
              .map(
                (p, i) => `
                  <tr>
                    <td>${i + 1}</td>
                    <td class="tabular-nums">${formatTime(p.atSeconds)}</td>
                    <td class="text-right tabular-nums">+${p.added}g</td>
                    <td class="text-right tabular-nums">${p.runningTotal}g</td>
                  </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </details>`;
}

export type HistoryOptions = {
  getBrews: () => Brew[];
  getUnexportedCount: () => number;
  onExport: () => void;
  onImportFile: (file: File) => Promise<string>;
};

export function mountHistory(root: HTMLElement, opts: HistoryOptions): { render: () => void } {
  root.innerHTML = `
    <div class="mt-8">
      <div role="alert" class="alert alert-warning mb-3" data-banner hidden>
        <span data-banner-text></span>
        <button class="btn btn-sm" data-export-banner>Export now</button>
      </div>
      <div class="flex items-baseline justify-between pb-2">
        <h2 class="text-xl font-bold">History</h2>
        <div class="flex items-center gap-2">
          <input data-filter class="input input-sm w-36" placeholder="filter by coffee" hidden />
          <button class="btn btn-sm btn-ghost" data-export>Export</button>
          <button class="btn btn-sm btn-ghost" data-import>Import</button>
          <input type="file" accept="application/json,.json" data-file hidden />
        </div>
      </div>
      <p class="text-sm opacity-70" data-status hidden></p>
      <div class="flex flex-col gap-2" data-list></div>
    </div>
  `;

  const list = root.querySelector<HTMLElement>("[data-list]")!;
  const filter = root.querySelector<HTMLInputElement>("[data-filter]")!;
  const banner = root.querySelector<HTMLElement>("[data-banner]")!;
  const bannerText = root.querySelector<HTMLElement>("[data-banner-text]")!;
  const status = root.querySelector<HTMLElement>("[data-status]")!;
  const fileInput = root.querySelector<HTMLInputElement>("[data-file]")!;

  function render() {
    const brews = opts.getBrews();

    const unexported = opts.getUnexportedCount();
    banner.hidden = unexported < 5;
    banner.classList.toggle("alert-error", unexported >= 15);
    bannerText.textContent = `${unexported} brews since last export.`;

    filter.hidden = brews.length === 0;
    const query = filter.value.trim().toLowerCase();
    const shown = query
      ? brews.filter((b) => b.coffeeName.toLowerCase().includes(query))
      : brews;
    list.innerHTML = shown.length
      ? shown
          .slice()
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map(brewCard)
          .join("")
      : `<p class="text-sm opacity-60">${brews.length ? "No brews match." : "No brews logged yet."}</p>`;
  }

  function showStatus(message: string) {
    status.textContent = message;
    status.hidden = false;
    setTimeout(() => (status.hidden = true), 6000);
  }

  for (const selector of ["[data-export]", "[data-export-banner]"]) {
    root.querySelector(selector)!.addEventListener("click", () => {
      opts.onExport();
      render();
    });
  }

  root.querySelector("[data-import]")!.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    showStatus(await opts.onImportFile(file));
    fileInput.value = "";
    render();
  });

  filter.addEventListener("input", render);
  render();
  return { render };
}
