# Deepfield skill reference

## Session files (in the reviewed workspace)

```text
.deepfield/graph.json     generator output; web app reads
.deepfield/inbox.json     web app writes remarks + verdict; this skill watches
.deepfield/review.json    local reviewed ticks; not for the agent
```

Both are gitignored. The web app does not call the agent. The agent does
not scrape the UI.

## CLI

From the Deepfield project (not necessarily the reviewed root):

```bash
npx tsx src/cli.ts generate --root <workspace> [--only repo,repo] [--base ref] [--base repo=ref]
npx tsx src/cli.ts serve --root <workspace> [--port 4173] [--only repo,repo] [--base ref] [--base repo=ref]
npx tsx src/cli.ts watch --root <workspace>
```

`--only` is membership (posix paths relative to `--root`). Omitted:
every discovered checkout with a non-empty delta.

`--base` defaults to `HEAD` (working tree). A plain `--base ref` applies
to every included checkout. `--base repo=ref` overrides one checkout.
A missing ref fails the generate. The generator never infers
`origin/main`.

`scripts/generate.sh`, `scripts/serve.sh`, and `scripts/watch.sh` wrap
the same commands and infer `--root` as cwd.

## Graph document

Version `1`. Arrays sorted by `id`. Positions are a pure function of ids.

- `nodes`: `service` | `cluster` | `file`
- `edges`: `import` | `contract`, with `crossService`
- `risks`: named rules plus evidence
- `paths`: review paths; each is cluster ids in walk order. A path is
  one connected walk (may span services). Every cluster is in exactly
  one path.
- `positions`: `{ x, y }` in 0..1 for services and clusters
- `warnings`: empty; a missing `--base` ref fails the generate instead

File ids: `file:<repo-rel>:<path>`. Root repo uses `.` as `repo-rel`.

## Determinism

Two generates of the same tree must be materially identical. If they
differ, the generator is wrong. See `docs/mapping-and-risk.md`.
