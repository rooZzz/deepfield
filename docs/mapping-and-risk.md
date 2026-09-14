# Mapping and risk rules

**Status:** draft, paired with `docs/prd.md` v0.5.
**Normative for generate.** Same tree in, same graph out. If a run disagrees,
the generator is wrong — not the change.

The agent does **not** map the change and does **not** assign risk. A
deterministic generator does. The agent runs that generator, boots the app,
applies inbox comments as code edits, then runs the generator again.

---

## 1. Stability contract

Two `generate` runs against the same local checkouts (same files, same
diffs, same membership, same bases) must produce a **materially identical**
graph.

Material (must be byte-identical after JSON canonicalisation):

- node set and node ids
- edge set and edge ids
- cluster membership and cluster ids
- file class (behavioural / mechanical / noise)
- risk hits (rule id, severity, evidence paths)
- review paths (partition and order)
- filter class of each file

Non-material (may be omitted in v1, or filled by templates only):

- optional prose summaries **if and only if** they are templates over the
  facts above (“3 behavioural files, 1 Retry hit on `foo.ts`”)
- web layout coordinates (derived from ids; if stored, use a deterministic
  layout seed)

Forbidden sources of volatility:

- asking a model to invent clusters, edges, or risk
- unordered object iteration that leaks into ids or sort order
- timestamps, random layout, LLM cluster titles as ids
- depending on `git` output without sorting

Every array in the graph document is sorted by id. Ids are derived, never
allocated sequentially in a way that depends on walk order — or, if they
are hashes, the hashed payload is itself sorted.

---

## 2. Session files

All paths are under the workspace root, gitignored:

```text
.deepfield/graph.json     generator output; web app reads
.deepfield/inbox.json     web app writes remarks + verdict; agent watches
.deepfield/review.json    reviewed file ids keyed by graph fingerprint
```

`inbox.json` is the only channel from the UI back to the agent. The web app
does not call the agent. The agent does not scrape the UI.

Inbox items carry author, timestamp, scope key, and (for line remarks) the
anchor text they were written against. `verdict` is `approve` or
`request-changes`. Reviewed ticks live in `review.json` and are dropped
when the graph fingerprint changes.

---

## 3. Mapping algorithm (ordered)

Run these steps in order. Do not skip, do not add a “smart” extra pass.

### M1. Layout

1. If `.gitmodules` exists, take its paths in file order, then sort by path.
2. Add any nested git roots under the workspace that are not in that list
   (also sorted by path).
3. Drop paths with no `.git` / gitdir on disk.

### M2. Membership and per-checkout delta

Layout is every nested checkout on disk. Membership is an input.

1. If generate was given `only`, keep exactly those checkout paths.
   Unknown names are an error. If `only` is omitted, keep every
   discovered checkout.
2. For each remaining checkout, independently:
   - `base` = per-checkout override, else generate `base`, else `HEAD`.
   - If `HEAD` is missing, `base` is the empty tree.
   - If `HEAD` exists and `base` is not a local ref, **fail** (do not
     guess `origin/main`, `master`, or a parent gitlink SHA).
   - `delta` = paths changed in `base...HEAD` plus staged plus unstaged
     plus untracked. `base...HEAD` is empty when `base` is `HEAD`.
   - If `delta` is empty, the checkout contributes **no file nodes**.

Do not use parent gitlink SHAs as the file list. Do not switch branches.

### M3. File nodes

One node per changed path that still exists or is a deletion.

- `id` = `file:<repo-rel>:<path-from-repo-root>`
- `repo` = checkout path relative to workspace, POSIX, no trailing slash
- deletions stay as file nodes with `change: delete`

### M4. Service nodes

One node per checkout that has at least one file node.

- `id` = `service:<repo-rel>`

### M5. File class (deterministic)

Assign exactly one class, first match wins:

| Class | When |
| --- | --- |
| `noise.pin` | path is a gitlink-only change in the meta-repo parent |
| `noise.lock` | lockfile (`package-lock.json`, `pnpm-lock.yaml`, `Cargo.lock`, `go.sum`, `yarn.lock`, `composer.lock`) |
| `noise.generated` | path matches `dist/`, `build/`, `generated/`, `*.generated.*`, `*.pb.go`, `*_pb2.py`, or a header that says `@generated` |
| `noise.format` | diff is whitespace/comment-only (no token change) |
| `noise.import` | diff touches only import/include/use lines |
| `noise.rename` | git rename with empty or identical-body diff |
| `noise.deps` | `package.json` / `go.mod` / `Cargo.toml` version bump with no other code in that file |
| `noise.docs` | `*.md`, `*.mdx`, `docs/**`, license files |
| `noise.fixture` | test fixtures (`**/fixtures/**`, `**/testdata/**`, `*.snap`) |
| `mechanical.dto` | path looks like a model/dto/types file and the diff is field add/rename without control flow |
| `mechanical.test` | test file whose production twin is also in the delta |
| `behavioural` | everything else |

“Looks like a model/dto/types file” (v1): basename matches
`/(types?|models?|dto|entities|schema)\./i` or path contains `/dto/` or
`/models/`. Control flow means a changed `if`, `switch`, `try`, `catch`,
`return`, `throw`, `await`, or equivalent keyword in the hunk.

### M6. Import edges

For languages we can parse cheaply in v1 (TypeScript/JavaScript first):

- Parse import/require specifiers in **behavioural** and `mechanical.*`
  files that exist (not deletions).
- Resolve relative specifiers inside the same checkout.
- Resolve specifiers that prefix another checkout’s known package name
  (`package.json` `name`, `go.mod` module, etc.) to that checkout.

Edge:

- `id` = `edge:import:<from-id>:<to-id>`
- `kind` = `import`
- If `from.repo != to.repo`, also set `crossService: true`

If resolve fails, **no edge**. Do not guess.

Other languages in v1: no import edges, path/contract edges only.

### M7. Contract edges

A file is a **contract file** if its path matches:

- `**/*.{proto,graphql,gql}`
- `**/openapi*.{yml,yaml,json}`
- `**/*swagger*.{yml,yaml,json}`
- `**/*.{avsc,avro}`
- `**/asyncapi*.{yml,yaml,json}`
- `**/*.d.ts` that lives in a `contracts/` or `api/` directory

If a contract file is in the delta, add edges to other delta files (any
checkout) whose contents mention that contract’s basename or exported
schema name.

- `id` = `edge:contract:<from-id>:<to-id>`
- `kind` = `contract`
- `crossService` as above

Mention-scan is literal substring, case-sensitive, over the current file
bytes. No embeddings.

### M7b. Echo edges

A shared header, field, or identifier often has no import and no
contract file. Connect those files when the **hunk** (added and removed
lines only) carries the same distinctive token in two or more services.

A token is distinctive if it is camelCase, PascalCase with a second hump,
snake_case, or kebab-case (including `X-Correlation-Id`), and its
normalised form is at least 8 `[a-z0-9]` characters. Normalise by
lowercasing, stripping a leading `x-`, then dropping non-alphanumerics
(`correlationId`, `correlation_id`, `correlation-id`, and
`X-Correlation-Id` are one token). Drop path-like strings (`.` `/`
space). Drop a short denylist of DOM/JS builtins (`toString`, …). If a
token hits more than 12 files, drop it.

**Hard match:** same normalised key in two or more services.

**Analog match** (locked judgement, still a pure function of the hunk):
split each token into parts on camelCase / snake / kebab, drop short
and generic parts (`id`, `key`, `dto`, `get`, `set`, …). Two *different*
keys analog-match only when:

- they have the same number of remaining parts, and
- every shorter part equals the other or is a prefix of it (min prefix
  3), and
- if there is only one remaining part, it must be a *proper* prefix
  (shorter ≥ 3, longer ≥ 7). Equal single stems do not match
  (`sessionId` vs `sessionKey`).

So `corrId` ~ `correlationId`, `reqId` ~ `requestId`. `cid` does not
match `correlationId` (`cid` is not a prefix of `correlation`). A
shorter distinctive token that fails the 8-character hard-key test may
still analog-match a longer one; it is not a hard key of its own
(`userId` in two services is not an echo). The generator does not know
what a correlation id is. A model does not add edges.

Prefer a hard match over analog. Echo edges are **cross-service only**.
They do not join clusters inside a checkout. One edge per unordered
service pair. Endpoints are the files with the highest *site score* in
each service: the best change line (quoted form of the token +4, a
`header` mention on that line +3) plus behavioural class (+1), then
lexicographic file id. The displayed token is the shared hard key with
the most files, else the analog pair’s preferred raw form (camelCase,
longer spelling when tied).

- `id` = `edge:echo:<from-id>:<to-id>` (`from-id` < `to-id`)
- `kind` = `echo`
- `crossService` = `true`
- `token` = a display form of the chosen token (prefer camelCase)

No embeddings. No model.

### M8. Clusters

Cluster **inside a service**, never across services. Cross-service story is
edges + review path, not a merged blob.

Within each service, take file nodes whose class is not `noise.*`.

1. Build an undirected graph of those files using `import` and `contract`
   edges that stay in-repo. Echo edges are cross-service and are ignored
   here.
2. Connected components are candidate clusters.
3. Singleton components that share a directory prefix with another
   component of size ≥1, at depth ≤ 2 from the repo root, **merge** into
   the largest sibling under that prefix (stable: max size, then
   lexicographically smallest member id).
4. Remaining singletons stay singleton clusters.

Cluster id:

```text
cluster:<repo-rel>:<sorted-member-file-ids joined by ',' hashed with sha256, first 12 hex>
```

Cluster **title** (not an id): longest common path prefix of members,
stripped of noise; if empty, the first member’s basename. Never an LLM
phrase.

A cluster may later show up in more than one service via a **cross-service
edge**. The UI may draw that as a visual group. Membership remains
per-service.

### M9. Review paths

The generator emits **one or more review paths**, not a single list of
cluster stops and not a per-service sort. Clusters stay inside one
checkout (M8). They are adjacent when an `import`, `contract`, or `echo`
edge joins a member of each (undirected). A path is a connected walk on that
graph. Cross-service story lives **inside** a path that spans checkouts.

Every cluster appears in exactly one path. Grow a path from a seed until
no unvisited neighbour remains, then seed the next path from whatever
is left. Do not keep walking from a previous path’s clusters once that
path has closed.

1. **Seed** a new path. Rank unvisited clusters by:
   - descending max risk severity (`high` > `medium` > `low` > none)
   - has a `crossService` edge before those that do not
   - has a `contract` or `echo` edge before those that do not
   - contains a `behavioural` file before those that do not
   - cluster id lexicographic
2. **Next** is an unvisited neighbour of any cluster **already on this
   path**. Rank those neighbours by:
   - descending max risk severity
   - adjacent across a service boundary before in-service
   - contract or echo, behavioural, cluster id (same as seed)

If two clusters share more than one edge, treat the adjacency as
cross-service when any joining edge has `crossService: true`.

Each path is an ordered array of cluster ids. Mechanical-only clusters
with no risk still appear, last in their component. The document field
is `paths` (array of those arrays). Path order is seed order, not id
order.

Do not order by service name. Do not concatenate every cluster into one
walk. That turns several reviews into one fake linear story.

---

## 4. Risk rules

A risk hit is emitted **only** when its evidence predicate is true. No
evidence, no hit. Severity is fixed by the rule. The generator never
“upgrades” or “downgrades” by vibe.

Hit shape:

```text
{
  id: "risk:<ruleId>:<sorted-evidence-node-ids hashed, 12 hex>",
  ruleId,
  severity,
  evidence: [{ nodeId, path, repo, excerpt? }],
  clusterIds,
  serviceIds
}
```

Excerpt, if present, is the first matching line (trimmed, max 120 chars).

### Rule table (v1)

| ID | Severity | Predicate (all must hold unless noted) |
| --- | --- | --- |
| `R1_CONTRACT` | high | A contract file (M7) is in the delta with a non-`noise.*` class |
| `R2_CROSS_SERVICE` | high | An `import`, `contract`, or `echo` edge has `crossService: true` and at least one end is `behavioural` |
| `R3_RETRY_IDEMPOTENCY` | high | A `behavioural` path or hunk matches `(?i)retry|idempotenc|at[-_ ]least[-_ ]once|exactly[-_ ]once|dedup|exactlyOnce|atLeastOnce` |
| `R4_AUTH_SECURITY` | high | A `behavioural` path or hunk matches `(?i)authz?|oauth|jwt|permission|rbac|acl|secret|password|api[_-]?key|crypto|csrf|cors` |
| `R5_DATA_LOSS` | high | A `behavioural` path or hunk matches `(?i)migrat|drop |truncate|delete from|destroy|cascade` or path contains `/migrations/` |
| `R6_ERROR_PROPAGATION` | medium | A hunk in a `behavioural` file adds or removes `catch` / `rescue` / `.catch(` / `except ` or changes a `throw` / `raise` line |
| `R7_TEST_REMOVED` | medium | A test file is `change: delete`, or a test file’s diff removes an assertion (`assert`, `expect(`, `should.`, `require.`) while a `behavioural` sibling is in the same cluster |
| `R8_SHARED_CONFIG` | medium | Path matches `(?i)feature.?flag|unleash|launchdarkly|config` and the file has a `crossService` edge or is imported by two services |
| `R9_BEHAVIOUR_MOVED` | high | Same basename (or detected rename) appears as `delete` in repo A and `add` in repo B in this generate |
| `R10_PAYMENT_MONEY` | high | A `behavioural` path or hunk matches `(?i)payment|payout|ledger|balance|currency|stripe|settlement` |

Matching is on POSIX path and on added/removed diff lines only (not the
whole file). Flags: case-insensitive as marked.

If several rules hit the same file, emit **all** hits. Do not collapse.
The cluster’s severity is the max of its hits.

### What is not risk

- File count, LOC, or “this cluster is large”
- “Looks important” without a rule
- Presence of a service in layout with an empty delta
- Pin-only parent changes (`noise.pin`)
- Docs, lockfiles, format-only diffs

---

## 5. Inbox apply (agent, not generator)

`inbox.json` is a list of feedback items. On file change the agent:

1. Reads the file. Ignores items already `applied` or `blocked`.
2. For each pending item, edits working trees in the checkouts named by
   the item’s target ids (and any repos the comment explicitly names).
3. Writes status back onto those items (`applied` / `partial` / `blocked`
   + a short reason). Do not drop history.
4. Runs `generate` again. Does not hand-edit `graph.json`.

Apply may be non-deterministic in the *code it writes*. That is expected.
The **next graph** must still obey this document. If the code change is
real, the graph is allowed to change — because the tree changed, not
because the mapper felt different.

Do not apply by restyling the map. Do not apply by bumping submodule pins
unless the item is about pins.

---

## 6. Tests the generator must pass

- Fixture meta-repo with stale parent pins and four live services
  (`checkout-web`, `checkout-api`, `payments-api`, `ledger-svc`) plus an
  empty-delta `idle-service`, generated with `--base origin/main`: generate
  twice, canonical JSON equal.
- Same fixture, shuffle disk walk if needed: still equal.
- Payment-retry style fixture: `R3_RETRY_IDEMPOTENCY` and
  `R2_CROSS_SERVICE` fire on the expected files; at least one review
  path spans all four live services and starts on a high-severity `R2`
  or `R3` cluster.
- Same fixture with default `HEAD` (clean feature-branch trees): no file
  nodes from those services.
- `--only` drops a dirty checkout that was not named.
- Echo: two services add `correlationId` / `X-Correlation-Id` in the
  hunk and have no import; one `echo` edge joins the service pair.
  Extra files with the same token do not add more edges. Quoted /
  `header` lines beat lex-smallest as endpoints. `corrId` analog-matches
  `correlationId`; `cid` and `sessionId`/`sessionKey` do not.
  `undefined` and same-repo repeats do not.
- Inbox apply that only changes a comment in code: regenerate; cluster ids
  for untouched files stay the same.
