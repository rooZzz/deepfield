# Deepfield — UX and UI (draft v0.1)

**Status:** draft, paired with `docs/prd.md` v0.5.
**Job of this document:** the product must feel like looking down on a
vertical change, not like opening another file list with a graph plugin.

The mapping rules in `docs/mapping-and-risk.md` decide *what* is on the
map. This document decides *how it is seen, touched, and commented on*.
Impressive is a requirement. Novelty-for-its-own-sake is not.

---

## 1. Intent

Deepfield is a **constellation of change**: a dark field, services as
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
- Graph in the centre, full height; path rail left; review (compact
  title + hunks) on the right — widescreen width, not a crushed bottom strip
- Light means *signal* (selection, path). Suns are identity, not risk.
  Risk lives on chips. The field stays dark.
- Motion is camera and settlement, not decoration. Star parallax is
  camera, not a second animation channel.

---

## 2. First five seconds

On boot (graph already generated):

1. **0–300ms** — black field, product mark “Deepfield”, no spinner circus.
2. **Settlement** — service territories ease into place from a
   deterministic layout seed. Clusters appear as suns, then take size.
3. **Path lights** — interconnects on the review paths brighten, then the
   camera rests on the whole scene.
4. **Readable** — you can read service names, cluster titles, and the
   first review path in the rail without hovering.

No splash marketing. No empty state that asks the user to “get started”
if a graph exists.

**Hosted demo only:** after the map is up, a single card. Lead hook:
Sick of reviewing 100-page diffs in an arbitrary order? Then tagline:
Review the real change not just the diff. Then how to use paths, the
map, the hunks, and the keys. The card grows with the viewport (not a
narrow stub in the middle of an ultrawide). Plain instructions. No
marketing voice. No em dashes. Dismiss (`ok` / `Esc` / click the dim).
Remember in this browser. Not a carousel. Not shown in the local skill
loop. Document title is `Deepfield | Demo`.

If generate is still running: a still field with a single status line,
not a skeleton of fake nodes.

---

## 3. Spatial model

The scene is **2D semantic topology with depth cues** (scale, atmosphere,
layering). It should already look like a top-down constellation. Literal
3D is a later camera on the same scene, not a different product.

### Layers (back → front)

1. **Field** — near-black, a Poisson-scattered star field (far dust,
   sparse brights), faint cool dust. Positions come from a seeded blue-
   noise sample, not a hash of `i`, a grid, or a golden-ratio spiral.
   Three depths **parallax with the Cytoscape camera**: far almost still,
   mid a little, near more. Stars wrap so the sky never runs out. A few
   near stars may twinkle slowly. Stars sit **behind** galaxies and
   **below** clusters. Not a photograph, not a stock starfield, not a
   screensaver, not idle drift. Stars never out-bright clusters, edges,
   or labels.
2. **Service territories** — a galaxy of stars per checkout, not a gas
   bloom. Seeded spiral, barred, or elliptical **star clusters** along
   log arms (seeded PRNG like the field; never a hash grid). Dense enough
   to read as a territory, sparse enough that graph clusters, edges, and
   HUD text stay on top. Palette is hashed from the service id (not a
   colour legend). Empty-delta context services (if shown) are dimmer
   and not in the path. Field stars sit behind galaxies; galaxies sit
   behind the graph.
3. **Edges** — in-service: short, dim. Cross-service: longer, higher arc,
   brighter. Contract edges are distinct from import edges (weight + dash,
   not colour alone).
4. **Clusters** — suns. Round opaque photosphere; corona, spots, and
   flares hash from the cluster title (same title, same sun). Not an
   oval. Field stars do not shine through the disc. Size still tracks
   behavioural weight, and does not jump when files or the selection
   halo appear. Mechanical-only are small dim suns, not hollow
   rings and not a red wash.
5. **Files** — planets on a hashed 2D orbit around their sun, visible at
   close zoom. Colour, size, and lane from the file path. Deleted:
   hollow. Not animated. Not a 3D swarm.
6. **Path** — the selected walk lights the interconnects it already
   uses. Not a second polyline on the same pair.
7. **Selection** — one focus. Everything else recedes (dim, do not hide).
8. **Comments** — small pins on the target. They never own the layout.

### Drill

The graph is **Cytoscape.js**: wheel and pinch zoom, pan, tap to select.
Positions come from the generator (preset layout). Do not run a force
layout. Drag pans the field, including over service territories. Those
galaxies are paint; they do not grab the pointer. Tap a service name on
the HUD to select that checkout.

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
single end). A file-to-file edge stays at file LOD so the planets stay
on screen. Import and contract lines on the map select that way.
Paint (ticks, notes) does not reset the camera. Clicking empty field /
`P` fits the whole scene and lights every path. Click a file (once
visible) to load it in the review pane.

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
│ TOP   deepfield  · status  ·  notes  ·  n/n done  ·  approve  ·  ?│
├─────────────────────────────────────────────────────────────────┤
│ INCLUDE   behavioural  tests  boilerplate  docs  generated      │
├──────────┬──────────────────────────────────┬───────────────────┤
│ REVIEW   │                                  │ REVIEW            │
│ PATHS    │            GRAPH                 │ title · summary,  │
│ list     │     (full height constellation)  │ reading cursor,   │
│          │                                  │ hunks in scope    │
└──────────┴──────────────────────────────────┴───────────────────┘
```

Widescreens have spare **width**. The graph keeps the full height under
the filter strip. Title, reading tools, and the change live in one right
pane (about 480px on a laptop, larger on a wide display). Drag the grip
from 380px up to the leftover width after the path rail and a floor for
the map — there is no 720px ceiling on a super-wide screen. There is no
bottom reel and no window footer; keyboard hints sit as a thin strip at
the foot of that pane.

### Top bar

Brand mark (quiet constellation) + “Deepfield”. Status dot and line.
Staged-note chip when anything is staged (opens the staged sheet).
Review progress for **every file on every review path** (not the
filtered file list). **approve** is a top-bar command for the whole
change. `?` opens the legend. No avatar, no extra nav.

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
- **progress** — done files / files on that path.

Do not list services or `from {repo}` on the row. Which checkouts a path
touches becomes clear when it is selected (map + review pane). `J` walks
up the list, `K` walks down. The selected row stays in the visible rail.
`P` / empty field returns the camera to the whole scene.

### Main — graph

Cytoscape constellation on the Nocturne field. Territories are galaxies
of clustered stars (spiral / barred / elliptical, no gas wash). Layout slots sit
on a spaced grid and do not overlap. Clusters are suns (title hashes
the look; size is behavioural weight). Files are planets on zoom.
Risk is chips on the rail and the file, not a red fill on the sun. The
selected review path is lit on its interconnects; other paths recede.
Cross-service and contract edges arc between clusters at overview. Wheel / pinch zoom
toward the cursor; more detail in. Clicking empty field returns to the
whole scene.

Quiet **camera chrome** sits in the lower-left of the field: zoom in,
zoom out, frame the current scope, follow files, fit the whole scene.
Follow files is **on** by default: walking files with `↑` `↓` or the
hunk list moves the camera along the review path. Toggle it off to keep
the selected path lit without the camera chasing the file cursor.
Selecting a review path still highlights that route and frames it. The
LOD readout lives under that stack. This is map instrumentation (glass,
hairline, mono), not a FAB and not chrome that covers the constellation.

### Right pane — review

Collapsible, resizable. This is inspector and change reviewer in one
column. The hunks are the pane. Chrome stays two short, fixed-height
rows:

1. **Title bar** — kicker, name, then summary and services on the same
   strip (truncated). Collapse control. No facts definition list, no
   risk-hit cards, no “edges from here” list (the map already shows
   edges).
2. **Reading tools** — one row: previous / next, `n / N`, done, note.
   This row does **not** include the current file path. Path length must
   not change the control size. `n / N` is tabular and fixed-width.
   Buttons are short and lowercase. **done** ticks the current file
   (same as `R`). **note** opens a composer on this scope. Do not put
   request or approve here.

The reading cursor and the hunk list stay in sync. `↑` `↓` (and the
prev / next pills) scroll the current file to the top of the hunk list.
Scrolling the hunk list, or clicking a file header, sets the cursor to
the file whose header is pinned.

Below: **the current review context** — files and hunks for whichever
of these you are on:

- a **review path** — files in every cluster on that path
- a **service** — files in that checkout
- a **cluster** — files in that cluster
- an **edge** — the two endpoint files

Do not also list those files as a second tree in the title bar. Do
not list files from other steps or services as “N lines collapsed”.
Include-class chips still hide classes; they are not a stand-in for
context.

Rule hits sit as **one-word chips on the file row** that holds the
evidence (title and excerpt on hover). Files with no hit have no chip.

Each hunk line stays a clickable row (unified diff: marker, line
number, code). Syntax colour is **Shiki tokens** on the code after the
marker. Add and delete are the line class (background), not a diff
widget, Monaco, or a side-by-side editor. Git file headers (`diff
--git`, mode, `index`, `---` / `+++`) start collapsed: the first line
is a disclosure; open it for the rest of the command. Hunk marks (`@@`)
and the change stay visible. Long lines do not widen the
pane or wrap. The hunk scrolls horizontally as a unit; marker and line
number stay pinned. Add / delete tint is the hunk width, not the length
of that line.

Click a line to note it (shift-click extends). `↑` `↓` move the cursor
inside the context. `R` ticks the file done. Space ticks and advances.

**approve** sits in the top bar. It writes a verdict for the whole
change and refuses if notes are still staged. **request changes** is
the footer of the staged-notes sheet, after the reviewer has read what
they staged. Neither action lives on a review path.

### No

- Overlays that sit on the map (floating path rail, floating inspector).
  Staged-notes review is a full-viewport sheet, not this. The camera
  cluster is field instrumentation, not an overlay of that kind.
- GitHub PR clone as the home screen
- Tabs “Graph | Files | Comments | Settings”
- Floating FABs (compose, share, AI)
- Stock Cytoscape demo skin

---

## 5. Nodes, edges, risk

### Service territory

- Named in small caps or a restrained mono, not a huge title card
- Shape is a galaxy of stars: spiral, barred, or elliptical cluster,
  hashed from the service id — not an opaque sphere, a hard oval, or a
  fog bloom
- Layout centres stay on a spaced grid so neighbouring galaxies do not merge
- Clicking the HUD name focuses the service: the review pane lists its
  clusters; path still global. The galaxy paint does not grab the
  pointer.

### Cluster

- A sun, never a folder icon, never a red risk disc
- Photosphere hashed from the cluster title. Same title, same sun.
  Disc is circular and opaque.
- Label: two lines max (title, then `3 files · payments-api`)
- Size = behavioural weight. The painted disc is that body at the
  current zoom. Edges, labels, and the selection halo must not change
  the diameter. Mechanical-only are smaller and dimmer, still a sun
- Noise is not a node (filtered in data). If the user unhides a noise
  class, those files appear as dust inside the territory, not peers of
  behavioural clusters

### File (expanded)

- Planets on a hashed orbit around the sun (lane and angle from the
  file path). Static seats, not spinning
- Label on hover or when selected; avoid 40 overlapping labels
- Deletion: hollow. Add: slightly brighter

### Edges

| Kind | Draw |
| --- | --- |
| import, same service | short, low contrast, solid |
| import, cross-service | long arc, higher contrast, solid, sits above territories |
| contract | same as cross-service plus a dash (not colour alone) |
| selected path | brighter / thicker on those interconnects; never a second stroke |

One stroke per cluster pair at overview (contract wins over import).
Do not draw a hairball. If a cluster would have more than ~8 visible
edges at the current zoom, keep the strongest (contract + cross-service)
and collapse the rest behind a count. Counts are data, not mystery.

### Risk

- Not a colour on the sun. Fill-as-heat made every hotspot rust-red
  and hid cool clusters. Risk stays on the path rail and as chips on
  the file that holds the evidence.
- The map does not draw `Retry` / `Money` chips and does not paint
  high/medium/cool on cluster bodies.
- Hits are **in the current scope**: one-word chip on that file; title
  and excerpt on hover. A rule may fire across the vertical change;
  selecting a review path, cluster, file, or edge only chips evidence
  files that sit in that scope. Other evidence stays on its own path.
- No skull icons, no emoji, no “CRITICAL!!!” banners

---

## 6. Review pane

Always the same skeleton: **compact title, then the hunks**. Notes
stage on the hunks and the scope composer in this pane. Rule chips live
on the sticky file header, not in a hit list above the diff.

### Cluster

- Title (path prefix); service and template summary in the title bar
- Member files as sticky headers over their hunks (sorted as in the
  graph document), with chips for evidence in that file

### File

- Filename in the title bar; `repo/path` on the sticky header
- Hits that cite this file as chips under that path
- Hunks for that file in the same pane. Git command headers are a
  closed disclosure on the first line, not four rows of metadata

### Edge

- Kind and from → to in the title bar; cross-service or not in the meta
- Hits whose evidence is an endpoint file as chips on those headers
- Endpoint hunks below

### Review path

- Hotspot name; summary and services in the title bar
- Risk chips: **only on evidence files on this path**. Do not unroll the
  rest of a multi-cluster rule.
- In-scope files as the hunk list, grouped by cluster headers

Title-bar copy comes from `graph.json`. The pane does not invent
summaries. If a template line exists in the document, show it; do not
have the UI ask a model.

---

## 7. Notes, review, and apply

Notes **stage locally**, then flush to `.deepfield/inbox.json`. Nothing
reaches the agent until request changes from the staged sheet.

### Scope

A note is written against a **scope key**: one review path, one service, one
cluster, one edge, one file, or a line range. The review pane only
shows notes whose scope key matches the scope the reviewer is in now.

### Anchors

Line notes store the **text they were written against**, not only a
line number. After regenerate, relocate:

- same text at the same offset → live
- same text elsewhere in the hunk → **moved**
- text gone → **stale**

### Author and time

Every note shows author and timestamp.

### Done

`R` / the tick / **done** ticks a file. The tick is centred in its box.
Each file’s header sticks to the top of the hunk list until that file’s hunks
have scrolled away — headers do not stack on top of each other. Counts
in the top bar and review paths use the **unfiltered files**. A new
`graph.json` (new fingerprint) invalidates reviewed state. Filters never
change the denominator.

### Composer

- Plain text. `Cmd-Enter` stages. Edit / delete while staged.
- Pins on the map: a count badge, dashed while staged.

### Staged notes

The staged-notes surface is a **full-viewport sheet**, not a centred
dialog. Open it from the top-bar chip. Esc closes. The graph is not
visible underneath — this is a review mode, not floating chrome on the
map.

**One note per row.** Each row is full width: the **target inline** on
the left, the note on the right.

| Note kind | Inline target |
| --- | --- |
| line / lines | file path plus the hunk excerpt, marked lines picked, syntax-coloured like the review pane |
| file | file path, class, change, hunk (capped) |
| cluster | title, service, summary, member files |
| edge | kind, from → to, cross-service or not, endpoint hunks when the ends are files |
| service | repo, files in that checkout |
| review path | path name, summary, risk chips, cluster titles in walk order |

Author, timestamp, drift, edit, and delete sit with the note body.
The footer is **request changes**: it flushes the staged set to the
inbox and sets `verdict: request-changes`.

### Terminal

- **request changes** — staged sheet only. Writes staged notes as inbox
  `pending` items and sets `verdict: request-changes`.
- **approve** — top bar only. Writes `verdict: approve`. Blocked while
  notes are still staged.

The skill loop is still apply. Deepfield does not click GitHub Approve.

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
visible. A hidden class leaves the hunk list and the territory; the cluster stays
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
| ready, hosted demo | full scene | `demo` |
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
- Quiet star twinkle: a handful of near-field stars, long period, low
  amplitude. **Parallax** is the star motion: far/mid/near depths track
  pan (and a little of zoom) at different rates. No idle particle drift,
  no pulsing of the whole field, no layout that keeps solving while the
  user is idle
- Reduced motion: jump-cut camera, skip path draw, skip star twinkle
  **and star parallax**. The map must still be fully usable

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
| camera follow | tie the camera to file browsing (on by default) |
| camera fit | whole scene (`P`) |
| click cluster / file / pin / edge | rescope |
| `J` `K` | up / down review path |
| `↑` `↓` or `[` `]` | file in current scope |
| `R` | done on this file |
| `Space` | done and next |
| `Enter` | expand cluster (file LOD) |
| `Esc` | close demo card / legend / cancel composer / collapse |
| `F` | behavioural only / all buckets |
| `P` | whole scene |
| `+` `=` / `−` | zoom in / out |
| `Cmd-Enter` in composer | stage note |
| `?` | legend |

Every control is a semantic `button` / `textarea` / `form`. Keyboard
focus uses `:focus-visible` (2px accent ring). Do not leave browser-blue
rings. Do not use non-focusable divs as buttons.

### Missing states

| State | Surface |
| --- | --- |
| generate failed | still field, status `generate failed`, one line |
| empty change | still field, `no change to review` |
| no risks | file rows have no rule chips |
| binary file | hunks: `binary file — no text diff` |
| diff too large | hunks: `diff too large to display` plus size |
| no hunk | hunks: `diff not captured by the run` |

---

## 13. What we will not ship

- A stock graph-library demo skin (default force layout, default
  colours, node = grey circle + filename)
- GitHub PR clone with a minimap
- 3D that you cannot read (orbiting spaghetti, perspective that hides
  labels)
- Rainbow risk heatmaps, gauge charts, “AI confidence” meters
- Onboarding carousels (the hosted demo may show one card, once)
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
   the review pane is used.
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
2. **Legend.** Always a faint corner key, or `?` only?
3. **3D.** Keep as a later camera, or is top-down 2D the entire visual
   identity if it already reads as a constellation?
