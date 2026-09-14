import { BUCKETS, type BucketId } from "./buckets.ts";
import { requireEl } from "./dom.ts";
import { CAMERA } from "./graph-elements.ts";
import { ACC } from "./palette.ts";

export function renderStatus(line: string, kind: "ready" | "busy" | "fail"): void {
  requireEl("#status").textContent = line;
  const dot = requireEl("#status-dot");
  dot.classList.toggle("warn", kind === "busy");
  dot.classList.toggle("idle", kind === "fail");
}

export function renderFilters(
  hidden: BucketId[],
  counts: Record<BucketId, number>,
  hiddenFiles: number,
  onToggle: (id: BucketId) => void,
): void {
  const wrap = requireEl("#filter-chips");
  wrap.replaceChildren();
  for (const bucket of BUCKETS) {
    const off = hidden.includes(bucket.id);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.title = bucket.hint;
    btn.className = `${off ? "off" : ""} ${bucket.id === "behavioural" && !off ? "beh" : ""}`.trim();
    btn.setAttribute("aria-pressed", off ? "false" : "true");
    btn.innerHTML = `<span class="mono">${bucket.label}</span><span class="mono dim">${counts[bucket.id]}</span>`;
    btn.addEventListener("click", () => onToggle(bucket.id));
    wrap.append(btn);
  }
  requireEl("#hidden-count").textContent = hiddenFiles ? `${hiddenFiles} files filtered out` : "";
}

export function renderProgress(done: number, total: number): void {
  requireEl("#review-label").textContent = `${done} / ${total} done`;
  const bar = requireEl("#review-bar");
  const pct = total ? (done / total) * 100 : 0;
  bar.style.width = `${pct}%`;
  bar.classList.toggle("done", total > 0 && done === total);
  bar.style.background = total > 0 && done === total ? "var(--color-add)" : ACC;
}

export function renderLod(zoom: number, filesVisible: boolean): void {
  const label = zoom > 2 ? "file names" : filesVisible ? "files" : zoom > 0.75 ? "clusters" : "overview";
  requireEl("#lod").textContent = `${zoom.toFixed(2)}× · ${label}`;
  requireEl("#cam-in").toggleAttribute("disabled", zoom >= CAMERA.max - 1e-6);
  requireEl("#cam-out").toggleAttribute("disabled", zoom <= CAMERA.min + 1e-6);
}

export function renderFollow(on: boolean): void {
  requireEl("#cam-follow").setAttribute("aria-pressed", on ? "true" : "false");
}

export function renderEchoes(on: boolean): void {
  const btn = requireEl("#map-echoes");
  btn.setAttribute("aria-pressed", on ? "true" : "false");
  const label = on ? "hide echo edges" : "show echo edges";
  btn.title = label;
  btn.setAttribute("aria-label", label);
}

export function renderVeil(show: boolean, line: string): void {
  const veil = requireEl("#veil");
  veil.hidden = !show;
  requireEl("#veil-line").textContent = line;
}

export function renderEmpty(show: boolean, text: string): void {
  const empty = requireEl("#empty-field");
  empty.hidden = !show;
  empty.textContent = text;
}

export function renderStagedChip(count: number, onOpen: () => void): void {
  const chip = requireEl("#staged-chip");
  chip.hidden = count === 0;
  chip.textContent = `${count} note${count === 1 ? "" : "s"}`;
  chip.onclick = onOpen;
}
