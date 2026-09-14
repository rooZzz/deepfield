import type { FileNode } from "../../src/types.ts";
import { el } from "./dom.ts";
import { withDrift, type StagedRemark } from "./remarks.ts";

export function remarkCard(
  remark: StagedRemark,
  file: FileNode | undefined,
  onEdit: (id: string) => void,
  onDelete: (id: string) => void,
): HTMLElement {
  const live = withDrift(remark, file);
  const when = new Date(remark.createdAt).toLocaleString();
  const card = el("div", { class: "remark" });
  card.append(
    el("div", { style: "display:flex;align-items:baseline;gap:8px;" }, [
      el("span", { class: "mono accent", style: "font-size:9px;letter-spacing:0.08em;text-transform:uppercase;" }, [remark.label]),
      el("span", { class: "mono dim", style: "font-size:9px;" }, [`${remark.author} · ${when}`]),
      el("span", { style: "flex:1" }),
      el("span", { class: "mono", style: "font-size:9px;padding:0 5px;border:1px dashed var(--color-accent-600);border-radius:3px;color:var(--color-accent-300);" }, [live.drift === "none" ? "staged" : live.drift]),
    ]),
    el("div", { style: "margin-top:3px;font-size:12px;" }, [remark.body]),
  );
  const edit = el("button", { type: "button", style: "border:0;background:transparent;padding:0;color:var(--color-neutral-400);font-size:10.5px;" }, ["edit"]);
  const del = el("button", { type: "button", style: "border:0;background:transparent;padding:0;color:var(--color-neutral-400);font-size:10.5px;" }, ["delete"]);
  edit.addEventListener("click", () => onEdit(remark.id));
  del.addEventListener("click", () => onDelete(remark.id));
  card.append(el("div", { style: "margin-top:6px;display:flex;gap:10px;" }, [edit, del]));
  return card;
}

export function composer(
  draft: string,
  label: string,
  kind: string,
  onDraft: (value: string) => void,
  onSubmit: () => void,
  onCancel: () => void,
): HTMLElement {
  const form = el("form", { class: "composer remark", style: "border:1px solid var(--color-accent-700);" });
  const area = el("textarea", { rows: "2", placeholder: "what needs addressing here?" });
  area.value = draft;
  area.addEventListener("input", () => onDraft(area.value));
  area.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      onSubmit();
    }
  });
  const cancel = el("button", { type: "button", style: "border:0;background:transparent;padding:0;color:var(--color-neutral-500);font-size:10.5px;" }, ["cancel"]);
  cancel.addEventListener("click", onCancel);
  const submit = el("button", { type: "submit", class: "btn-primary", style: "font-size:11.5px;padding:5px 11px;" }, ["stage"]);
  form.append(
    el("div", { style: "display:flex;justify-content:space-between;margin-bottom:6px;" }, [
      el("span", { class: "mono accent", style: "font-size:10px;" }, [`→ ${label}`]),
      el("span", { class: "mono dim", style: "font-size:9.5px;" }, [kind]),
    ]),
    area,
    el("div", { style: "display:flex;justify-content:space-between;margin-top:6px;" }, [cancel, submit]),
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    onSubmit();
  });
  queueMicrotask(() => area.focus());
  return form;
}
