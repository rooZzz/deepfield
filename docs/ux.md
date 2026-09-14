# Eagle Eye — UX and UI (draft v0.1)

**Status:** draft, paired with `docs/prd.md` v0.5.
**Job of this document:** the product must feel like looking down on a
vertical change, not like opening another file list with a graph plugin.

The mapping rules in `docs/mapping-and-risk.md` decide *what* is on the
map. This document decides *how it is seen, touched, and commented on*.
Impressive is a requirement. Novelty-for-its-own-sake is not.

---

## 1. Intent

Eagle Eye is a **constellation of change**: a dark field, services as
territories, clusters as bodies of light, risk as flare, the review path
as a route you can walk. The first impression has to be spatial and
serious — closer to a night operations map than to GitHub, Graphviz, or a
SaaS dashboard.

It still has to be a working review tool in under a minute. Beauty that
hides the path, the risk rule, or the comment box has failed.

### Bar

After a cold boot on a four-service feature, a staff engineer should be
able to say, out loud, without reading a file:

> “Checkout and payments moved together. Retry is the hotspot. I start
> there, then the client.”

If they instead say “nice graph” and then hunt for the file list, the UI
is wrong.

### Feel

- Aerial, not bureaucratic
- Dense, not cluttered
- Quiet chrome, loud map
- Graph in the centre; path, inspector, and diff have their own panes
- Light means *signal* (risk, selection, path). The field stays dark.
- Motion is camera and settlement, not decoration

---

## 2. First five seconds

On boot (graph already generated):

1. **0–300ms** — black field, product mark “Eagle Eye”, no spinner circus.
2. **Settlement** — service territories ease into place from a
   deterministic layout seed. Clusters appear as points, then take size.
3. **Path lights** — review paths draw as routes on the map, then the
   camera rests on the whole scene.
4. **Readable** — you can read service names, cluster titles, and the
   first review path in the rail without hovering.

No splash marketing. No empty state that asks the user to “get started”
if a graph exists.

If generate is still running: a still field with a single status line,
not a skeleton of fake nodes.

---

## 3. Spatial model

The scene is **2D semantic topology with depth cues** (scale, atmosphere,
layering). It should already look like a top-down constellation. Literal
3D is a later camera on the same scene, not a different product.

### Layers (back → front)

1. **Field** — near-black, sparse stars, faint cool dust. Not a photograph,
   not a stock starfield texture.
2. **Service territories** — nebula blooms, one per checkout. Overlapping
   translucent gas in the Nocturne cool palette, irregular silhouette,
   hashed from the service id (not a colour legend). Empty-delta context
   services (if shown) are dimmer and not in the path. Gas sits *behind*
   clusters and edges; it never hides internals.
3. **Edges** — in-service: short, dim. Cross-service: longer, higher arc,
   brighter. Contract edges are distinct from import edges (weight + dash,
   not colour alone).
4. **Clusters** — the primary bodies. Size = behavioural weight (count of
   `behavioural` files, not raw LOC). Title = path prefix from the
   generator.
5. **Risk corona** — a ring / flare on clusters that have hits. Strength
   follows max severity. Always paired with a one-word rule chip
   (`Retry`, `Boundary`, `Money`, …), never `R3` / `R10`.
6. **Path** — a polyline through each review path’s clusters. The
   selected path is the brightest route on the map.
7. **Selection** — one focus. Everything else recedes (dim, do not hide).
8. **Comments** — small pins on the target. They never own the layout.

### Drill

The graph is **Cytoscape.js**: wheel and pinch zoom, pan, tap to select.
Positions come from the generator (preset layout). Do not run a force
layout.

Detail is a function of zoom:

| Zoom | Visible |
| --- | --- |
| Fitted (overview) | services, clusters, contract / cross-service edges |
| Mid | cluster labels, in-service import edges |
| Close | files around their cluster |
| Closer | file names |

Clicking a **review path** frames every service, cluster, and connecting
edge on that path (territory zoom, not file LOD) and recedes everything
else. A service, cluster, or edge does the same at a zoom that fits
that scope (cluster → file LOD; service → territory; edge → **both
endpoint clusters and the interconnect**, never a hidden file or a
single end). Import, contract, and path-hop lines on the map all select
that way. Paint (ticks, remarks) does not reset the camera. Clicking
empty field / `P` fits the whole scene and lights every path. Click a
file (once visible) to load it in the inspector and the bottom diff.

Never replace the map with a file list page.

### Layout stability

Positions are a **pure function of graph ids** (and a fixed seed). A
regenerate that does not change membership must not shuffle the sky.
Nodes with the same id keep their seat; new nodes enter; removed nodes
fade. This is UX and determinism, not polish.

---

## 4. Frame (chrome)

The window is an **app shell**. Look and feel is **Nocturne**: near-neutral
blue-grey ground (`#161826`), Inter + IBM Plex Mono, 8px radii, blurple
accent `#9184d9` as a line and a glow — never a flood. The graph is
Cytoscape (preset layout, wheel zoom, zoom LOD). Chrome is structural.

```text
┌─────────────────────────────────────────────────────────────────┐
│ TOP   eye  EAGLE EYE  · status  ·  n/N reviewed  ·  ?           │
├─────────────────────────────────────────────────────────────────┤
│ INCLUDE   behavioural  tests  boilerplate  docs  generated      │
├──────────┬──────────────────────────────────┬───────────────────┤
│ REVIEW   │                                  │ INSPECTOR         │
│ PATHS    │            GRAPH                 │ facts, risk,      │
│ list     │     (Cytoscape constellation)    │ in-scope files    │
├──────────┴──────────────────────────────────┴───────────────────┤
│ REEL   reading cursor · mark   │  files in the current context  │
└─────────────────────────────────────────────────────────────────┘
```

### Top bar

Brand mark (eye) + “Eagle Eye”. Status dot and line. Staged-remark chip
when anything is staged. Review progress for **every file on every
review path** (not the filtered file list). `?` opens the legend. No
avatar, no extra nav.

### Filter strip

Include buckets: behavioural, tests, boilerplate, docs, generated.
Default: all on. `F` flips to behavioural-only. A filter change is local;
it does not regenerate. Progress in the top bar still counts every file
on every review path.

### Left pane — review paths

Collapsible, resizable. No walk headline, no assumed service flow, no
“steps” kicker. The **list is the review paths**. Each row is one path
(a connected walk that may cross services):

- **name** — hotspot cluster title (highest severity on the path, then
  walk order). Template over graph facts, not a nickname.
- **summary** — fact template: cluster count and file count.
- **risk chips** — unique one-word rule labels on that path.
- **progress** — reviewed files / files on that path.

Do not list services or `from {repo}` on the row. Which checkouts a path
touches becomes clear when it is selected (map + inspector). `J` / `K`
walks the list. `P` / empty field returns the camera to the whole scene.

### Main — graph

Cytoscape constellation on the Nocturne field. Territories are nebula
blooms (layered translucent gas, no hard oval stroke). Layout slots sit
on a spaced grid and do not overlap. Clusters are discs (size = behavioural weight;
mechanical-only are hollow). Risk is a corona plus a rule chip. The
selected review path is lit; other paths recede. Cross-service and
contract edges arc between clusters at overview. Wheel / pinch zoom
toward the cursor; more detail in. Clicking empty field returns to the
whole scene.

Quiet **camera chrome** sits in the lower-left of the field: zoom in,
zoom out, frame the current scope, fit the whole scene. The LOD readout
lives under that stack. This is map instrumentation (glass, hairline,
mono), not a FAB and not chrome that covers the constellation.

### Right pane — inspector

Collapsible, resizable. Title, facts, risk hits (or an explicit **no
risks** state), in-scope files grouped by cluster. No composer here —
remarks are staged on the reel.

### Bottom — change reel

The reel is **the current review context**, not a dump of the whole
change with other files folded. Context is whichever of these you are
on:

- a **review path** — files in every cluster on that path
- a **service** — files in that checkout
- a **cluster** — files in that cluster
- an **edge** — the two endpoint files

Left: that context, reading cursor, mark reviewed. Right: those files
with hunks. Do not list files from other steps or services as “N lines
collapsed”. Include-class chips still hide classes; they are not a
stand-in for context.

Each hunk line stays a clickable row (unified diff: marker, line
number, code). Syntax colour is **Shiki tokens** on the code after the
marker. Add and delete are the line class (background), not a diff
widget, Monaco, or a side-by-side editor.

Click a line to remark (shift-click extends). `↑` `↓` move the cursor
inside the context. `R` marks reviewed. Space marks and advances.

Terminal actions on the reel chrome: **Approve** and **Request changes**.
Request changes submits staged remarks to the inbox. Approve writes a
verdict and refuses if remarks are still staged.

### No

- Overlays that sit on the map (floating path rail, floating inspector).
  Staged-remark review is a full-viewport sheet, not this. The camera
  cluster is field instrumentation, not an overlay of that kind.
- GitHub PR clone as the home screen
- Tabs “Graph | Files | Comments | Settings”
- Floating FABs (compose, share, AI)
- Stock Cytoscape demo skin

---

## 5. Nodes, edges, risk

### Service territory

- Named in small caps or a restrained mono, not a huge title card
- Shape is a nebula bloom: several soft lobes, low-alpha additive gas,
  gone at the rim — not an opaque sphere or a hard oval
- Layout centres stay on a spaced grid so neighbouring blooms do not merge
- Clicking the hull (not a cluster) focuses the service: inspector lists
  its clusters; path still global

### Cluster

- Disc or compact hull, never a folder icon
- Label: two lines max (title, then `3 files · payments-api`)
- Behavioural clusters are solid; mechanical-only are hollow / dim
- Noise is not a node (filtered in data). If the user unhides a noise
  class, those files appear as dust inside the territory, not peers of
  behavioural clusters

### File (expanded)

- Small points on a short orbit around the cluster
- Label on hover or when selected; avoid 40 overlapping labels
- Deletion: struck / hollow. Add: slightly brighter

### Edges

| Kind | Draw |
| --- | --- |
| import, same service | short, low contrast |
| import, cross-service | long arc, higher contrast, sits above territories |
| contract | same as cross-service plus a distinct dash or double line |
| path | separate layer per review path; ignores edge kind |

Do not draw a hairball. If a cluster would have more than ~8 visible
edges at the current zoom, keep the strongest (contract + cross-service
+ path) and collapse the rest behind a count. Counts are data, not
mystery.

### Risk

- Corona + rule chip on the cluster. Chips are one-word labels (`Retry`,
  `Money`, `Contract`), not numbered ids. The full rule title is on hover
  and spelled out in the inspector.
- Inspector lists hits **in the current scope**: one-word label, title,
  severity, evidence path, excerpt. A rule may fire across the vertical
  change; selecting a review path, cluster, file, or edge only shows
  evidence files that sit in that scope. Other evidence stays on its
  own path.
- Colour is allowed (high = hot, medium = amber, none = cool) **and**
  shape/brightness. Colour-only is a fail
- No skull icons, no emoji, no “CRITICAL!!!” banners

---

## 6. Inspector

Always the same skeleton: **title, facts, in-scope files**. Remarks are
not composed here — they stage on the reel.

### Cluster

- Title (path prefix), service, template summary, one-word rule chips
- Risk hits: evidence files in this cluster, or an explicit **no risks** empty
- Edges in / out, especially `crossService`
- Member files grouped by cluster (sorted as in the graph document)

### File

- `repo/path`, class, change kind, parent cluster
- Hits that cite this file
- No hunk preview here; the reel owns the diff

### Edge

- Kind, from → to, cross-service or not
- Hits whose evidence is an endpoint file

### Review path

- Hotspot name, summary, services, rule chips for rules that fire on
  this path
- Risk hits: **only evidence files on this path**. Do not unroll the
  rest of a multi-cluster rule.
- In-scope files grouped by cluster

Facts come from `graph.json`. The inspector does not invent summaries.
If a template line exists in the document, show it; do not have the UI
ask a model.

---

## 7. Remarks, review, and apply

Remarks **stage locally**, then flush to `.eagle-eye/inbox.json`. Nothing
reaches the agent until Request changes (or an explicit submit of the
staged set).

### Scope

A remark is written against a **scope key**: one review path, one service, one
cluster, one edge, one file, or a line range. The reel and inspector only
show remarks whose scope key matches the scope the reviewer is in now.

### Anchors

Line remarks store the **text they were written against**, not only a
line number. After regenerate, relocate:

- same text at the same offset → live
- same text elsewhere in the hunk → **moved**
- text gone → **stale**

### Author and time

Every remark shows author and timestamp.

### Reviewed

`R` / the tick marks a file reviewed. The tick is centred in its box.
Each file’s header sticks to the top of the reel until that file’s hunks
have scrolled away — headers do not stack on top of each other. Counts
in the top bar and review paths use the **unfiltered files**. A new
`graph.json` (new fingerprint) invalidates reviewed state. Filters never
change the denominator.

### Composer

- Plain text. `Cmd-Enter` stages. Edit / delete while staged.
- Pins on the map: a count badge, dashed while staged.

### Staged review

The staged-remarks surface is a **full-viewport sheet**, not a centred
dialog. Open it from the top-bar chip. Esc closes. The graph is not
visible underneath — this is a review mode, not floating chrome on the
map.

**One remark per row.** Each row is full width: the **target inline** on
the left, the remark on the right.

| Remark kind | Inline target |
| --- | --- |
| line / lines | file path plus the hunk excerpt, marked lines picked, syntax-coloured like the reel |
| file | file path, class, change, hunk (capped) |
| cluster | title, service, summary, member files |
| edge | kind, from → to, cross-service or not, endpoint hunks when the ends are files |
| service | repo, files in that checkout |
| review path | path name, summary, risk chips, cluster titles in walk order |

Author, timestamp, drift, edit, and delete sit with the remark body.
Submit flushes the staged set to the inbox.

### Terminal

- **Request changes** — writes staged remarks as inbox `pending` items
  and sets `verdict: request-changes`.
- **Approve** — writes `verdict: approve`. Blocked while remarks are
  still staged.

The skill loop is still apply. Eagle Eye does not click GitHub Approve.

---

## 8. Filters

Include chips on the strip under the top bar, not a settings modal.

| Bucket | Classes |
| --- | --- |
| behavioural | `behavioural` |
| tests | `mechanical.test` |
| boilerplate | `mechanical.dto`, `noise.import`, `noise.rename` |
| docs | `noise.docs` |
| generated | `noise.generated`, `noise.lock`, `noise.format`, `noise.pin`, `noise.deps`, `noise.fixture` |

Default: every bucket included. `F` hides all but behavioural. Hits stay
visible. A hidden class leaves the reel and the bloom; the cluster stays
if any visible member or any hit remains. Progress still uses the full
path.

---

## 9. Live states

The UI is a client of two files. Make that visible without turning it
into a developer console.

| State | Map | Strip |
| --- | --- | --- |
| generating | last graph remains, dimmed, or empty field on first run | `generating` |
| ready, watching | full scene | `watching inbox` |
| inbox dirty (write just happened) | pins pending | `inbox sent` |
| applying | field stays; do not blank | `applying · N notes` |
| regenerating | ids that survive hold still; others fade/enter | `regenerating` |
| error | last good graph stays | `generate failed` + one line |

Never show a stack trace as the home screen. Never toast-spam.

On regenerate, the camera prefers the previously focused id if it still
exists; otherwise the current review path; otherwise the full view.

---

## 10. Motion

Budget: short, spatial, the same every time.

- Settlement and camera ease: ~400–700ms, ease-in-out
- Path draw (first load only, or when the path set changes): once
- Pin appear: small scale-in
- No idle particle drift, no pulsing of the whole field, no layout
  that keeps solving while the user is idle
- Reduced motion: jump-cut camera, skip path draw, skip bloom
  animation. The map must still be fully usable

Layout solvers must stop. A graph that breathes forever looks alive and
reads as noise.

---

## 11. Visual system

### Type

- UI chrome: one grotesque, tabular figures, modest size
- Map labels: the same family at small optical sizes, or a narrow
  sans; cluster titles must remain legible at default zoom
- Rule ids and repo names: monospace
- No display / script / “AI” typefaces
- No emoji

### Colour

Nocturne tokens. Field `#0f1120` / `#161826`. Accent `#9184d9` (line and
glow). High risk `#c58a72`. Medium `#b9a06a`. Additions `#8fbf98`.
Deletions `#cf8f83`. Selection and path use the accent, not a second
hue. No flood fills. No stock Cytoscape colours.

### Density

At default zoom: 8–40 cluster bodies is the design centre. More
services → territories stay, clusters stay collapsed. The user zooms;
we do not shrink type to fit 200 labels.

---

## 12. Keyboard and pointer

| Input | Action |
| --- | --- |
| drag field, trackpad | pan |
| scroll / pinch | zoom toward cursor |
| camera `+` `−` | zoom toward field centre |
| camera frame | frame current scope (`Enter`) |
| camera fit | whole scene (`P`) |
| click cluster / file / pin / edge | rescope |
| `J` `K` | next / previous review path |
| `↑` `↓` or `[` `]` | file in current scope |
| `R` | mark file reviewed |
| `Space` | mark and next |
| `Enter` | expand cluster (file LOD) |
| `Esc` | close legend / cancel composer / collapse |
| `F` | behavioural only / all buckets |
| `P` | whole scene |
| `+` `=` / `−` | zoom in / out |
| `Cmd-Enter` in composer | stage remark |
| `?` | legend |

Every control is a semantic `button` / `textarea` / `form`. Keyboard
focus uses `:focus-visible` (2px accent ring). Do not leave browser-blue
rings. Do not use non-focusable divs as buttons.

### Missing states

| State | Surface |
| --- | --- |
| generate failed | still field, status `generate failed`, one line |
| empty change | still field, `no change to review` |
| no risks | inspector: explicit empty, not a blank list |
| binary file | reel: `binary file — no text diff` |
| diff too large | reel: `diff too large to display` plus size |
| no hunk | reel: `diff not captured by the run` |

---

## 13. What we will not ship

- A stock graph-library demo skin (default force layout, default
  colours, node = grey circle + filename)
- GitHub PR clone with a minimap
- 3D that you cannot read (orbiting spaghetti, perspective that hides
  labels)
- Rainbow risk heatmaps, gauge charts, “AI confidence” meters
- Onboarding carousels
- Settings pages before the map works
- Sound
- Emoji, badges-for-everything, celebratory confetti on apply

Impressive here means **presence and clarity**, not spectacle.

---

## 14. Rendering (requirement, not stack fetish)

v1 must be able to:

- Draw 40 clusters, ~6 territories, ~100 edges at 60fps on a laptop
- Animate camera and settlement without dropping the inspector to 10fps
- Keep layout deterministic (see §3)

SVG or Canvas/WebGL are both acceptable. A heavy graph GUI kit is not
the starting point. If a library is used, it is a renderer, not the
product look.

The web app is a Vite TypeScript SPA, full viewport, no extra product
chrome from a UI kit. See `AGENTS.md`.

---

## 15. Success

The UX is right when:

1. The opening settlement makes the cross-service story obvious before
   the inspector is used.
2. Walking the path with `J`/`K` is enough for a first pass.
3. A comment on a cross-service edge is three keys away from a focused
   target, and the pin stays on that edge through regenerate if the
   edge id survives.
4. A second generate of the same tree does not “reshuffle the stars.”
5. Someone who has seen a GitHub file tree and a Graphviz PNG does not
   confuse this for either.

---

## 16. Open questions

1. **Hue per service vs one cool field.** One field is calmer; per-service
   hue helps meta-repos. Proposed: one field, territory hulls labelled,
   accent only on path/selection/risk.
2. **Hunk preview in inspector.** How much diff in v1 — first 40 lines,
   or “open in editor” only?
3. **Legend.** Always a faint corner key, or `?` only?
4. **3D.** Keep as a later camera, or is top-down 2D the entire visual
   identity if it already reads as a constellation?
