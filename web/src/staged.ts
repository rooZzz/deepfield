import type { FileNode, GraphDocument } from "../../src/types.ts";
import { el, requireEl } from "./dom.ts";
import { byId } from "./model.ts";
import { withDrift, type StagedRemark } from "./remarks.ts";
import { renderStagedCtx } from "./staged-ctx.ts";

export function renderStaged(
  remarks: StagedRemark[],
  graph: GraphDocument,
  open: boolean,
  onClose: () => void,
  onSubmit: () => void,
  onEdit: (id: string) => void,
  onDelete: (id: string) => void,
): void {
  const overlay = requireEl("#overlay");
  overlay.hidden = !open || remarks.length === 0;
  if (overlay.hidden) {
    return;
  }
  const list = requireEl("#staged-list");
  list.replaceChildren();
  for (const remark of remarks) {
    list.append(stagedRow(remark, graph, onEdit, onDelete));
  }
  requireEl("#staged-count").textContent = `${remarks.length} ${remarks.length === 1 ? "remark" : "remarks"}`;
  const submit = requireEl("#staged-submit");
  submit.textContent = `Submit ${remarks.length} remark${remarks.length === 1 ? "" : "s"} to agent`;
  submit.onclick = onSubmit;
  requireEl("#staged-close").onclick = onClose;
}

function stagedRow(
  remark: StagedRemark,
  graph: GraphDocument,
  onEdit: (id: string) => void,
  onDelete: (id: string) => void,
): HTMLElement {
  const file = remark.fileId ? fileOf(graph, remark.fileId) : undefined;
  const live = withDrift(remark, file);
  const when = new Date(remark.createdAt).toLocaleString();
  const note = el("div", { class: "staged-note" });
  const edit = el("button", { type: "button", class: "staged-act" }, ["Edit"]);
  const del = el("button", { type: "button", class: "staged-act" }, ["Delete"]);
  edit.addEventListener("click", () => onEdit(remark.id));
  del.addEventListener("click", () => onDelete(remark.id));
  note.append(
    el("div", { class: "staged-meta" }, [
      el("span", { class: "mono accent", style: "font-size:9px;letter-spacing:0.08em;text-transform:uppercase;" }, [remark.label]),
      el("span", { class: "mono dim", style: "font-size:9px;" }, [`${remark.author} · ${when}`]),
      el("span", { class: "mono staged-drift" }, [live.drift === "none" ? "staged" : live.drift]),
    ]),
    el("div", { class: "staged-body" }, [remark.body]),
    el("div", { class: "staged-actions" }, [edit, del]),
  );
  return el("article", { class: "staged-row" }, [renderStagedCtx(remark, graph), note]);
}

function fileOf(graph: GraphDocument, id: string): FileNode | undefined {
  const node = byId(graph, id);
  return node?.kind === "file" ? node : undefined;
}
