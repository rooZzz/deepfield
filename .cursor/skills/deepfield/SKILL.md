---
name: deepfield
description: >-
  Maps a vertical change as a deterministic clustered graph and boots the
  Deepfield constellation web app. Use when the user asks for a Deepfield
  review, a change graph, a visual review of a meta-repo or multi-service
  feature, or to apply comments from the Deepfield inbox.
---

# Deepfield

Review the change, not the diff. Mapping and risk are a generator, not
judgment. Follow `docs/mapping-and-risk.md`. UI follows `docs/ux.md`.

From this repo root, the CLI is `npx tsx src/cli.ts`. Wrappers live in
`scripts/` next to this file.

## Instructions

Work in the workspace the user wants reviewed (often a meta-repo of
submodules). Parent gitlink pins may be stale. That is normal. Do not
update pins unless the user asks. Do not check out `main` (or any other
branch) to “fix” the graph.

You choose **scope**. The generator does not guess `origin/main` and does
not pick services.

generate change graph and boot webapp
listen for changes to .deepfield/inbox.json
  — that is where the user's comments will be sent
  — when that file changes: make the changes, then regenerate the graph

### Scope

Before generate, from the user, the conversation, and local git:

1. `REVIEW_ROOT` — the meta-repo (or single repo) on disk.
2. `--only` — nested checkout paths relative to that root that belong in
   this review (named services, current branches, dirty trees). Omit only
   when the whole view is the review.
3. `--base` — omit to review the working tree (staged, unstaged,
   untracked vs `HEAD`). If the review should include commits already on
   a branch, take the base from the harness (a PR target, a branch the
   user named, a SHA). Repeat `--base repo=ref` when checkouts differ.
   Do not default to `origin/main`.

Leave those checkouts on the branches they already have.

### Generate and boot

```bash
npx tsx src/cli.ts generate --root "$REVIEW_ROOT" --only "$REPOS" [--base "$BASE"]
npx tsx src/cli.ts serve --root "$REVIEW_ROOT" --only "$REPOS" [--base "$BASE"]
```

Do not hand-edit `.deepfield/graph.json`. Do not invent clusters, edges,
risk, or path order.

### Listen

```bash
npx tsx src/cli.ts watch --root "$REVIEW_ROOT"
```

This blocks until `.deepfield/inbox.json` changes, then exits 0.

### When the inbox changes

1. Read `.deepfield/inbox.json`. Ignore items with status `applied` or
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
5. Run generate again with the **same** `--only` and `--base` as the
   first generate. Then boot/serve if the app is not running. Then watch
   again.

## Examples

**Vertical feature in a submodule meta-repo**

User: "Deepfield this." You name the in-play checkouts, generate with
`--only`, serve, and watch. You do not `git submodule update` first. You
do not check out `main`.

**Comment apply**

Inbox item on `edge:contract:...`: "client must match retry contract."
You edit the consumer and producer checkouts as needed, mark the item
applied, generate with the same scope.

## Additional resources

- [reference.md](reference.md) — schema, CLI, session files
- [examples.md](examples.md) — more loops
- [docs/mapping-and-risk.md](../../../docs/mapping-and-risk.md)
- [docs/ux.md](../../../docs/ux.md)
