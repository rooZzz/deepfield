# Deepfield

Review the change, not the diff. Keep the product, the skill, and the web
app simple. Prefer boring, industry-standard Node patterns over novelty.

## Stack

- Node.js, current LTS
- TypeScript, ESM (`"type": "module"`)
- Web app: Vite + TypeScript SPA, bundled with the skill
- Graph: Cytoscape.js (preset layout, wheel/pinch zoom, zoom-based detail)
- Tests: Node's built-in test runner + Playwright
- Package manager: npm

Do not add a UI kit. The graph is Cytoscape, styled to the product — not a
demo skin. Do not hand-draw zoom/pan.

## Layout

Project skill lives where Cursor loads it. Supporting code stays in `src/`
and `web/`. Session files are written into the *target* workspace.

```text
.cursor/skills/deepfield/
  SKILL.md            required skill entry
  reference.md        graph schema, CLI, session files
  examples.md         invoke / apply loop
  scripts/            thin wrappers over src/cli.ts
src/                  generator, git, risk, serve, watch
web/                  constellation SPA
test/                 node tests + git fixture builder
e2e/                  Playwright
docs/                 PRD, mapping-and-risk, ux
.deepfield/           graph.json + inbox.json in the reviewed workspace
```

Do not invent extra packages. Do not put skills in `~/.cursor/skills-cursor/`.

## Code

- TypeScript a mid-level engineer can read in one pass.
- Pure functions, explicit types, named exports. One idea per module.
- **Soft cap: ~250 lines per file.** Split before it grows past that.
  300 is a smell. Do not add a second concern to dodge the cap.
- Fail loudly. No empty `catch`. Wrap errors with context, keep the cause.
- No `any`. Narrow at system boundaries.
- 2-space indent, trailing commas, no clever one-liners.

```ts
// ❌
try {
  await buildGraph(diff);
} catch {}

// ✅
try {
  return await buildGraph(diff);
} catch (error) {
  throw new Error("Failed to build change graph from git diff", { cause: error });
}
```

## Git graph vs AI

Generate is a deterministic Node program. Rules live in
`docs/mapping-and-risk.md`. Same tree, same graph. The agent must not
cluster, title, score risk, or order the review path by judgment. Echo
analog matches are published generator rules, not a model.

A meta-repo is layout, not the change. Discover nested checkouts from
`.gitmodules` and on-disk git roots. Membership (`--only`) and comparison
base (`--base`, default `HEAD`) are inputs from the invoking agent. Do
not guess `origin/main`. Do not use parent submodule pin SHAs as the
file list. Skip checkouts whose local delta is empty.

Skill loop: generate `.deepfield/graph.json`, boot the web app, watch
`.deepfield/inbox.json`. On inbox change, apply comments to the named
checkouts, then generate again. Never hand-edit `graph.json`.

## Product docs

`docs/prd.md`, `docs/mapping-and-risk.md`, and `docs/ux.md` are the source
of truth. If implementation disagrees, stop and update the doc first.

The web app must match `docs/ux.md`. No stock graph-library skin.

## What not to do

- Do not take over GitHub/GitLab approval, required checks, or merge.
- Do not default the UI to 3D.
- Do not list files alphabetically as the primary review surface.
- Do not require submodule pin updates before a review.
- Do not let a model invent topology, clusters, risk, or path order.
- Do not treat a second generate of the same tree as a new review.
- Do not push or merge as a side effect of apply.
- Do not commit secrets, generated bundles, or `node_modules`.
