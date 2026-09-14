# Deepfield — Product Requirements (draft v0.5)

**Status:** draft for refinement. Not an implementation spec yet.
**Proposition:** review the change, not the diff.

This document captures the product we want to build: a Cursor agent skill plus
a bundled web app that maps a vertical change as a clustered graph. The
primary workspace is a **meta-repo of git submodules used as a local view**
over several services. One feature becomes several PRs; Deepfield reviews
that feature end to end as one map. The skill **generates a deterministic
graph, boots the web app, and watches one inbox file** for comments; on
change it applies those comments into the checkouts and generates again.

Mapping and risk are specified in [mapping-and-risk.md](mapping-and-risk.md).
They are rules, not judgment. Two generates of the same tree must not
produce a materially different review.

How the map is seen and used is specified in [ux.md](ux.md). The experience
must be spatially impressive: a constellation of the change, not a file
list with a graph widget.

Source conversation: [Visual Code Reviews](https://chatgpt.com/share/6aa797c9-b290-83eb-9806-14ecde96edb4).

---

## 1. Problem

Code review of non-trivial change is still a file walk — and, for a vertical
feature, it is **N file walks**. Hosts present one PR at a time, in git order:
path-sorted files, hunks, maybe a changed-file tree. The interesting object is
the whole feature: API in one service, consumer in another, worker in a third.

A meta-repo of submodules is how that object exists on disk. It is a view over
the services, not a pin-accurate record of in-flight work. Updating submodule
pointers on every nested commit is arduous. Pins are typically refreshed to
latest `main` **after** the large change has landed and the per-service PRs
have merged. During the work that actually needs review, the parent gitlinks
are stale on purpose.

So the host cannot be the unit of review, and the parent pin diff cannot be
the source of truth.

Reviewers actually need to answer, quickly, **across the local checkouts**:

1. What changed materially?
2. What parts of the system does it affect?
3. Which changes belong together (including across services)?
4. Where is the risk — especially at service boundaries?
5. What should I inspect first?

They do not need another wall of files, and they do not need to keep the
meta-repo pins in sync in order to see the map.

Feedback has the same problem. A note on a cross-service cluster (“retry
must not duplicate payments; the client has to match”) does not belong in
one GitHub thread. It belongs on the map, and it has to be **writable back
into the checkouts** that make up the change.

Until zero-touch deployment of non-trivial change exists, review has to scale
with the size of the *feature*, not the size of any one PR’s file list.

---

## 2. Vision

A constellation of change: a visual map of what moved in this vertical
feature, how those pockets connect across services, and where the risk sits.

- **One feature, one map.** Several submodule PRs are slices of one change.
  Deepfield reviews the union.
- **Clusters, not files.** A 70-file / 4-repo change becomes a handful of
  named nodes (for example “payment retry”, “order contract”, “checkout
  wiring”).
- **Connections, not adjacency on disk.** Edges show callers, APIs, shared
  types, service boundaries, and cross-repo contracts.
- **Risk as a first-class layer, from named rules.** A hotspot exists only
  when a rule in `docs/mapping-and-risk.md` has evidence. No evidence, no
  risk. Same tree, same hits.
- **Architectural order.** Review follows a **deterministic path** (risk,
  then contracts, then behavioural, then the rest).
- **File-watch loop.** Generate graph, boot web app, listen on one inbox
  file. Comments land there. On change: apply into checkouts, generate
  again. The map is not a slideshow and the agent is not polling the UI.
- **Ship path unchanged.** Each service still lands as its own PR. Hosts
  still own approval, required checks, and merge. Deepfield owns the e2e
  review and the apply-into-working-trees loop.

---

## 3. Goals and non-goals

### Goals (v1)

- Treat a **vertical change** as the unit of review: local work across
  nested service checkouts, not a single host PR and not a parent pin bump.
- Produce a **deterministic change graph** from facts on the local machine
  (nested git state, paths, imports, manifests) via a generator, not a
  model. Same tree → same nodes, edges, clusters, risk hits, and path.
- Map and score risk **only** by the published rules in
  `docs/mapping-and-risk.md`.
- Render a **visually impressive 2D constellation** per [ux.md](ux.md):
  galaxy territories, clusters as bodies of light, risk as flare plus
  rule id, review path as a walkable route. Quiet chrome, loud map.
- Show **interconnects across services** and **review paths** that can
  each cross repo boundaries.
- Keep **semantic filters** first-class, using the same file classes as the
  generator (`noise.*`, `mechanical.*`, `behavioural`).
- Skill loop: **generate + boot**, then **watch `.deepfield/inbox.json`**;
  on change, apply comments into the right checkouts and generate again.

### Non-goals (v1)

- Requiring the meta-repo submodule pins to be updated before a review.
- Using parent gitlink SHA diffs as the primary change set.
- Replacing host approval, required checks, or merge of the N PRs.
- Auto-applying every keystroke; apply is an explicit action.
- Auto-pushing, auto-merging, auto-approving, or silently committing.
- Asking a model to invent topology, clusters, risk, or review order.
- Treating two generates of the same tree as “a fresh review.”
- A stock graph-library demo, a GitHub PR clone, or a dashboard shell
  around the map. See [ux.md](ux.md) §13.
- Full program analysis / precise call graphs for every language on day one.
- A SaaS, accounts, or a hosted multi-tenant service.

---

## 4. Users and moments

| Who | When | What they need |
| --- | --- | --- |
| Author | Feature branches checked out in several submodules, pins not updated | See the blast radius; apply review notes into the right services |
| Reviewer | Looking at a vertical feature that is several PRs | One map, one path, feedback that is not trapped in a single PR thread |
| Staff / architect | Cross-service change in the meta-repo view | Contract edges, service clusters, risk at boundaries |
| Cursor agent | User invokes the skill | Generate graph; boot web app; watch inbox; apply; generate again |

Primary trigger: the Cursor workspace is (or contains) the meta-repo, and the
user invokes Deepfield. From then on the inbox file is the comment channel.

---

## 5. Core concepts

### 5.1 Vertical change (the unit of review)

A **vertical change** is the union of local deltas in nested service
checkouts that belong to one feature. It is not:

- a single GitHub/GitLab PR
- a meta-repo commit that only moves submodule pointers
- “everything that has ever diverged on this machine”

It *is* what you would describe as “this feature, as it exists on disk right
now.” Host PRs are **slices** of that change. Each slice still lands and is
approved in its own repo. Deepfield maps the whole, and writes applied
feedback back into those same checkouts.

### 5.2 Local machine state, not pins

The meta-repo is a **layout**: `.gitmodules` (and nested `.git` directories)
tell Deepfield which service checkouts live where.

The change itself is derived from **each checkout’s local git state**, as
it sits on disk: whatever branch is checked out, plus staged, unstaged,
and untracked files. The invoking agent names which checkouts belong in
the review and, when the review includes commits already on those
branches, names the comparison base. The generator does **not** guess
`origin/main`.

Parent gitlinks are **out of band** during active work. They are housekeeping
after merge (“re-pin meta-repo to latest main on each submodule”). Deepfield
must produce a correct map while those pointers still name old mains.

Do not wait for `git add submodule && git commit` in the parent. Do not treat
“submodule has new commits, parent still points at old SHA” as an incomplete
workspace. That is the normal in-flight state.

**Pin-only diffs** (parent records new SHAs, nested working trees are clean
and on `main`) are a different object: a housekeeping PR. v1 may show them as
a thin “pointers moved” note. They are not the primary review.

### 5.3 Deterministic generate

The graph is produced by a **generator** (Node, tested, no model). The
algorithm is [mapping-and-risk.md](mapping-and-risk.md). Short form:

```text
layout → per-checkout delta → file nodes → file class
       → import/contract edges → per-service clusters
       → risk hits (named rules + evidence)
       → review paths (connected walks on interconnects)
       → write .deepfield/graph.json
```

Two generates of the same tree must be materially identical (same nodes,
edges, cluster membership, risk hits, paths). Volatility here makes the
tool unusable: apply → regenerate would feel like a different review.

Checkouts with an empty local delta are **layout**, not file nodes. If a
fact cannot be established, omit the edge. Never fabricate connections.

### 5.4 What the agent is for

The agent does **not** map the change and does **not** define risk. It
**does** name the review scope: which nested checkouts to include, and
which git base to diff when the review is more than the working tree.

The skill is this loop:

1. **Generate** `.deepfield/graph.json` and **boot** the web app on it.
2. **Listen** to `.deepfield/inbox.json`. That file is where the web app
   sends user comments.
3. When the inbox file changes: **apply** pending comments as edits in the
   named checkout(s), write status back onto the items, **generate again**.

The model is allowed only at apply time: turning a comment into file edits.
It must not restyle the graph, invent edges, or add risk. After apply, the
generator is the only writer of `graph.json`.

### 5.5 Clusters (pockets of change)

A cluster is a **per-service** connected group of non-noise files (import +
in-repo contract edges, plus a small directory-prefix merge). Id is a hash
of sorted member file ids. Title is the longest common path prefix — not a
model nickname.

Cross-service story is **edges**, not one blob:

> `payments-api` cluster `src/payment` (Retry, Contract) —edge→
> `checkout-web` cluster `src/api` (consumer of the new contract).

Clicking a cluster drills into facts → files (with repo) → ordinary
diff/code. Optional one-line summaries, if present, are templates over
those facts (“3 behavioural files, 1 Retry hit on `retry.ts`”), so they
cannot drift independently of the hits.

### 5.6 Review path

The path is a total order on clusters from the mapping spec: highest risk,
then contract edges, then behavioural, then stable id tie-break. It is
allowed to cross services because the sort is global.

That is reviewing in rule order instead of git order, and instead of
“finish repo A’s PR, then open repo B’s PR.”

### 5.7 Semantic filter

Filtering uses generator file classes. Default hide: `noise.*`. Optional
hide: `mechanical.*`. `behavioural` and any node with a risk hit stay
visible unless the user unhides a class *and* explicitly hides hits
(don’t: hiding risk is not v1).

A 70-file / N-repo change should collapse to a handful of clusters plus
their risk badges.

### 5.8 Feedback, inbox, apply

The map is not read-only. The web app writes **feedback items** to
`.deepfield/inbox.json`, attached to graph targets (cluster, file, edge,
path, risk hit, service).

That file is the comment channel. The skill’s second job is: **watch it**.
When it changes, apply pending items, then generate.

Apply (agent):

1. Read pending items (`applied` / `blocked` ignored).
2. Edit working trees in the checkouts named by the target ids (and any
   repos the comment explicitly names). Never the parent pin set unless
   the item is about pins.
3. Mark each item `applied`, `partial`, or `blocked` (with why). Do not
   drop history.
4. Run generate. Do not hand-edit `graph.json`.

Apply writes **local files**. It does not push, merge, approve, or bump
pins. Default is a dirty working tree.

Unapplied items survive generate, keyed by target identity (stable ids from
the mapping spec), not by layout coordinates.

GitHub/GitLab comments are optional **mirrors** of a slice (P1), not the
e2e channel.

---

## 6. Product surface

Deepfield is **one project** with two surfaces and a **file protocol**:

1. **Cursor agent skill** — a strict loop, not a free-form “review this”:
   - generate change graph
   - boot web app
   - listen for changes to `.deepfield/inbox.json`
   - on change: apply comments, generate again
2. **Bundled web app** — reads `graph.json`, writes comments to
   `inbox.json`. It never maps, never scores risk, never patches services.

Session dir (gitignored): `.deepfield/graph.json`, `.deepfield/inbox.json`.

### Skill (normative)

When invoked, the agent must:

```text
generate change graph and boot webapp
listen for changes to .deepfield/inbox.json
  — that is where the user's comments will be sent
  — when that file changes: make the changes, then regenerate the graph
```

Generate is a CLI/script. Boot is a local server pointed at the graph
file. A **GitHub Pages build** is a static fixture of the same SPA
(baked `graph.json`; notes and ticks stay in the browser). It is a
shareable demo, not the skill loop. First visit shows one card (hook,
tagline, how to use it), then the map. Listen is a file watch (script or skill loop) on that one path. The
agent does not invent a second channel.

### Web app

Normative UI is [ux.md](ux.md). In short:

- Full-viewport **app shell**: top bar, left path, centre graph (full
  height), right review pane (compact title + hunks).
- Path rail + keyboard walk (`J`/`K`) is the primary review gesture.
- Inspector on focus; comments submit to `.deepfield/inbox.json`.
- Layout is a pure function of graph ids (no shuffle on regenerate).
- Status strip for generate / watch / apply. Hits stay on the file that
  holds the evidence.

---

## 7. Visual language

Default: **2D constellation** (semantic topology with depth cues). Full
spec: [ux.md](ux.md).

- Service territories → suns (clusters) → planets (files on expand).
- Cross-service and contract edges as high arcs; the selected review
  path lights those arcs, and is not drawn as a second stroke.
- Risk: chips on the path rail and the evidence file. Not a red wash
  on the map.
- Sun look hashes from cluster title. Size from behavioural weight.
  Positions from ids (stable across generate).
- App shell: top bar, left review path, centre graph (full height),
  right review pane (compact title + hunks). Graph is never covered by floating chrome
  (path rail, review pane, FABs). Staged-notes review is a full-viewport
  sheet, not a dialog on the map.

Literal 3D is a later camera on the same scene (`ux.md` §16). Do not block
v1 on 3D, and do not ship unreadable orbiting spaghetti.

---

## 8. Discovering the vertical change

This is the defining ingest path. Single-repo review is the degenerate case
(one checkout, one delta).

### 8.1 Layout (from the meta-repo)

From the workspace root:

1. Read `.gitmodules` if present — canonical list of nested service paths.
2. Also accept nested git checkouts that are present on disk even if a
   gitlink is missing or stale (partial clone, `submodule absorbgitdirs`,
   or a folder of sibling repos used the same way).
3. Skip checkouts that are not present on disk (uninitialized submodule).

Layout answers “which services could be in this view.” It does not answer
“what changed.”

### 8.2 Delta (from each included checkout)

The generator does not invent a base and does not switch branches.

```text
HEAD  = whatever is actually checked out (branch, detached, dirty)
base  = per-checkout override, else generate --base, else HEAD
delta = git diff of base...HEAD (empty when base is HEAD),
        plus staged, unstaged, and untracked work
```

A missing `--base` ref is an error. Do not fall back to `origin/main`,
`master`, or the parent gitlink SHA.

Include the checkout in the change **iff the delta is non-empty**.

A checkout sitting cleanly on its base is scenery. It may still appear as a
**consumer/producer context node** if another included checkout’s skeleton
has a contract edge to it, but it does not contribute files.

### 8.3 Membership

Layout is every nested checkout on disk. Membership is an input.

The skill (the consuming agent) decides which services belong in this
review from the user, the conversation, and local git (current branches,
dirty trees). It passes those paths as `generate --only`. It leaves each
checkout on its current branch. It does not `git checkout main` and it
does not update pins.

If `--only` is omitted, generate keeps every discovered checkout whose
delta vs the requested bases is non-empty. That fallback is the working
trees, not “everything that has diverged from main.” Two unrelated dirty
checkouts in the same view still merge into one map; `--only` is how the
harness prevents that.

When the review should include commits already on a branch, the agent
passes `--base` from harness context (a PR target, a branch the user
named, a SHA). Repeat `--base repo=ref` when checkouts differ. Committed
feature-branch work is invisible unless that base is supplied.

### 8.4 What we deliberately ignore

- Parent `git diff` of gitlink SHAs as the file list
- Requiring `git submodule update` or a pin commit before review
- Fetching all remotes as a precondition (use what is already local;
  fetch is optional and user-triggered)
- Inventing a PR graph from GitHub when the disks already tell the story

Host PR URLs, when they exist for a checkout’s current branch, are **links
on a slice** (P1), not the ingest mechanism.

### 8.5 Cross-service edges in v1

Coarse and factual:

- import / module path that resolves into another checkout
- shared package name
- OpenAPI / proto / event schema files touched in one checkout and
  referenced in another
- documented contract paths
- distinctive tokens in the hunk that appear in two or more services
  (echo): hard spelling identity, then a published analog test
  (part/prefix), never a model. Same tree, same edges.

Precision can improve later. Missing an edge is better than guessing.

---

## 9. Functional requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| F1 | Discover nested checkouts from local layout (`.gitmodules` + on-disk git) | P0 |
| F2 | Compute each included checkout’s local delta vs the harness-supplied base (default HEAD); union into one change | P0 |
| F3 | Do not use parent submodule pins as the primary change set | P0 |
| F4 | Emit canonical `.deepfield/graph.json` (sorted ids; schema versioned) | P0 |
| F5 | Generator implements `docs/mapping-and-risk.md` with no model in the loop | P0 |
| F6 | Same tree → materially identical graph (tested, including shuffled walks) | P0 |
| F7 | Risk hits only from named rules with evidence; each review path is a connected walk on interconnects | P0 |
| F8 | Bundled web app: constellation UI per `docs/ux.md`; reads `graph.json`; writes `inbox.json` | P0 |
| F8a | Deterministic layout from graph ids; path rail + keyboard walk; inspector + composer | P0 |
| F8b | Opening settlement makes the cross-service story readable before the inspector | P0 |
| F9 | Skill: generate, boot web app, watch inbox, apply, generate again | P0 |
| F10 | Semantic filters = generator file classes | P0 |
| F11 | Cluster click → facts → files (with repo) → diff/code | P0 |
| F12 | Review path listed and navigable, including cross-repo steps | P0 |
| F13 | Service grouping and interconnect edges from import/contract/echo resolve | P0 |
| F14 | Works as a Cursor skill on a personal or project install | P0 |
| F15 | Inbox items attach to stable graph target ids | P0 |
| F16 | Inbox items persist across generate | P0 |
| F17 | On inbox change, agent applies into the correct local checkout(s) | P0 |
| F18 | After apply, only the generator writes `graph.json`; items get applied/partial/blocked | P0 |
| F19 | Drill-through to ordinary file view in the right checkout | P1 |
| F20 | Deep link each slice to its GitHub/GitLab PR when one exists | P1 |
| F21 | Optional mirror of feedback onto the slice’s host PR | P1 |
| F22 | Membership filters (branch prefix, include/exclude checkouts) | P1 |
| F23 | Opt-in commit-per-checkout after apply | P1 |
| F24 | 3D constellation mode | P2 |
| F25 | Language-accurate call graphs beyond imports | P2 |
| F26 | Persist a graph snapshot for later | P2 |
| F27 | Treat pin-only parent commits as housekeeping, not the feature map | P2 |

---

## 10. Architecture (intended)

```text
generate (Node, rules) ──► .deepfield/graph.json
                              │
                              ▼
                         boot web app
                              │
                         user comments
                              ▼
                    .deepfield/inbox.json  ◄── watch
                              │
                              ▼
              agent apply ──► checkout working trees
                              │
                              ▼
                           generate again
```

Principles:

- Mapping, class, cluster, risk, and path are **code + rules**.
- The agent orchestrates the loop and applies natural-language comments.
- The web app is a viewer and an inbox writer. It does not re-derive
  topology.
- Canonical JSON and golden-file tests are part of v1, not polish.
- All ingest is local. No account, no upload.

The skill text should stay close to: generate and boot; listen on the
inbox file; on change, make the changes and regenerate.

---

## 11. Success

v1 is successful when an author or reviewer of a vertical feature can, with
**stale parent pins** and **several dirty or feature-branched submodules**:

1. Get one named-cluster map of the whole feature within a minute.
2. Run generate twice on the same tree and see the same graph (ids, risk,
   path).
3. Point at interconnects across services on that map.
4. Follow a review path that puts rule-based risk first, even when that
   path crosses repos.
5. Ignore `noise.*` without dropping a hit.
6. Leave a comment in the app (inbox file changes) and have the agent
   apply it, then see a regenerated map that only moved where the tree
   moved.
7. Still land and approve the work as N ordinary PRs.

A good internal test: the payment-retry fixture fires `R3_RETRY_IDEMPOTENCY`
and `R2_CROSS_SERVICE` on the expected files, the path visits all four
live services starting on a high `R2`/`R3` cluster, and a second generate
is JSON-identical. Parent pins still point at last week’s `main`.

---

## 12. Phasing

### Phase 0 — this document

Agree product shape, local-state ingest, and skill+app split.

### Phase 1 — generator + golden graphs

- Graph JSON schema; `.deepfield/` session files
- Layout + per-checkout delta + mapping/risk rules
- Tests: stale pins, byte-stable generate, payment-retry rule hits

### Phase 2 — skill loop + constellation app

- Skill: generate, boot, watch inbox, apply, generate
- Full-viewport map per `docs/ux.md`; comments to `inbox.json`
- Golden UX check: path walk + stable layout on second generate

### Phase 3 — slice links + membership filters

- PR deep links per checkout
- Optional include/exclude / branch-prefix filters
- Optional mirror of feedback onto host PR threads
- Opt-in commit-per-checkout after apply

### Phase 4 — 3D + richer analysis

- Constellation mode
- Better symbol/call graph where it pays off

---

## 13. Open questions

Answer these before Phase 1 hardens.

1. **Skill location.** Personal (`~/.cursor/skills/deepfield`) vs project
   skill that ships in this repo for others to copy?
2. **Membership when several features share a view.** The agent passes
   `--only`. Omitted `--only` means every checkout with a non-empty delta
   vs the requested bases. Branch-prefix UI filters remain P1 (F22).
3. **Base ref per checkout.** Default `HEAD` (working tree). Explicit
   `--base` / `--base repo=ref` from the harness. Never infer
   `origin/main`. A missing ref fails the generate. No implicit fetch.
4. **Languages in v1.** TypeScript/JavaScript imports first, then a generic
   file-path fallback for everything else?
5. **How the app is served.** The skill loop boots a local Vite server
   against `.deepfield/`. GitHub Pages hosts a static fixture demo of the
   same SPA for sharing a link. Generate, inbox watch, and apply stay
   local.
6. **Inbox schema.** One JSON array of items vs newline JSON? Proposed:
   versioned JSON document, rewritten in place, so the watch is simple.
7. **Auth and private code.** Graph documents stay on disk; never upload
   diffs unless the user later asks for a hosted mode.
8. **3D.** Keep as a later camera on the same scene (`docs/ux.md`)?
   Proposed: yes — v1 is already a top-down constellation.
9. **Hue per service.** See `docs/ux.md` §16. Proposed: one cool field,
   accent only on path / selection / risk.
10. **Name.** Deepfield in the UI, package, skill, folder, GitHub remote,
    and Pages path.
11. **Sibling folders without `.gitmodules`.** Same ingest if the workspace
    is just a directory of cloned repos? Proposed: yes, if they are nested
    git roots, because the product cares about local checkouts, not the
    gitlink mechanism.
12. **Apply commits.** Default is write the working tree only. Should v1
    offer “commit in each touched checkout” as an explicit follow-up?
13. **Who applies.** Author applying a reviewer’s notes in the same
    workspace is the v1 loop. Remote/async review (reviewer never has the
    checkouts) is later, if ever.
14. **GitHub as a mirror.** Keep host PR comments as P1, or never, so e2e
    feedback does not fork into two threads?

---

## 14. Decisions already made

| Decision | Choice |
| --- | --- |
| Product name | Deepfield |
| Package / skill | `deepfield` |
| Repo folder | `deepfield` (`~/dev/deepfield`); GitHub `rooZzz/deepfield` |
| Version control | git |
| Runtime | Node (TypeScript, ESM) |
| Surfaces | Cursor agent skill + bundled web app |
| Code style | Simple, industry-standard; see `AGENTS.md` |
| Graph authorship | Deterministic generator; see `docs/mapping-and-risk.md` |
| Agent role | Orchestrate loop + apply inbox comments as code edits |
| Skill loop | Generate + boot; watch `.deepfield/inbox.json`; apply; generate |
| Comment channel | `.deepfield/inbox.json` only |
| Risk | Named rules with evidence; no model scoring |
| Default visualisation | 2D constellation; see `docs/ux.md` |
| UI bar | Aerial map, not a file list or graph-library demo |
| Relationship to GitHub/GitLab | Hosts own approval, checks, merge; Deepfield owns e2e review + apply |
| Tagline | Review the change, not the diff |
| Primary workspace | Meta-repo of service checkouts (git submodules as a view) |
| Unit of review | Vertical change (union of local nested deltas), not one PR |
| Source of truth | Local machine / checkout git state |
| Submodule pins | Housekeeping after merge; not required for review |
| Ingest | No implicit network; use what is already on disk |
| Feedback | Left on graph targets in the tool |
| Apply | Explicit; agent writes the correct local checkout(s); then rebuild |
| Apply does not | Push, merge, approve, or bump parent pins |
