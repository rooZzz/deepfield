---
name: eagle-eye
description: >-
  Maps a vertical change as a deterministic clustered graph and boots the
  Eagle Eye constellation web app. Use when the user asks for an Eagle Eye
  review, a change graph, a visual review of a meta-repo or multi-service
  feature, or to apply comments from the Eagle Eye inbox.
---

# Eagle Eye

Review the change, not the diff. Mapping and risk are a generator, not
judgment. Follow `docs/mapping-and-risk.md`. UI follows `docs/ux.md`.

From this repo root, the CLI is `npx tsx src/cli.ts`. Wrappers live in
`scripts/` next to this file.

## Instructions

Work in the workspace the user wants reviewed (often a meta-repo of
submodules). Parent gitlink pins may be stale. That is normal. Do not
update pins unless the user asks.

generate change graph and boot webapp
listen for changes to .eagle-eye/inbox.json
  — that is where the user's comments will be sent
  — when that file changes: make the changes, then regenerate the graph

### Generate and boot

```bash
npx tsx src/cli.ts generate --root "$REVIEW_ROOT"
npx tsx src/cli.ts serve --root "$REVIEW_ROOT"
```

`REVIEW_ROOT` is the meta-repo (or single repo) on disk. Default: cwd.

Do not hand-edit `.eagle-eye/graph.json`. Do not invent clusters, edges,
risk, or path order.

### Listen

```bash
npx tsx src/cli.ts watch --root "$REVIEW_ROOT"
```

This blocks until `.eagle-eye/inbox.json` changes, then exits 0.

### When the inbox changes

1. Read `.eagle-eye/inbox.json`. Ignore items with status `applied` or
   `blocked`.
2. If `verdict.kind` is `approve` and nothing is `pending`, report that
   the review was approved. Do not invent extra edits.
3. If `verdict.kind` is `request-changes` (or any `pending` items exist),
   for each `pending` item edit working trees in the checkouts named by
   the target id (and any `extraRepos`). Do not bump parent submodule pins
   unless the item is about pins. Do not push, merge, or commit unless
   the user asked to commit. Do not click GitHub/GitLab Approve.
4. Set each item to `applied`, `partial`, or `blocked` with a short
   reason. Keep history.
5. Run generate again. Then boot/serve if the app is not running. Then
   watch again.

## Examples

**Vertical feature in a submodule meta-repo**

User: "Eagle Eye this." You generate, serve, and watch. You do not
`git submodule update` first.

**Comment apply**

Inbox item on `edge:contract:...`: "client must match retry contract."
You edit the consumer and producer checkouts as needed, mark the item
applied, generate.

## Additional resources

- [reference.md](reference.md) — schema, CLI, session files
- [examples.md](examples.md) — more loops
- [docs/mapping-and-risk.md](../../../docs/mapping-and-risk.md)
- [docs/ux.md](../../../docs/ux.md)
