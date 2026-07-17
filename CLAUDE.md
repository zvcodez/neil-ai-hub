# Neil AI Hub — project briefing for Claude

Personal PWA "mission control" dashboard for an AI learning journey. Owner's
GitHub username: **zvcodez**. Live at **https://zvcodez.github.io/neil-ai-hub/**.

## How it's built (IMPORTANT: no build step)
- **No bundler, no Node toolchain.** It's plain static files: real React 18 +
  [htm](https://github.com/developit/htm) loaded as **vendored ES modules**.
- The user's Mac has **no Node/npm/Homebrew** — do NOT introduce Vite/webpack or
  anything that needs `npm install`. Keep it buildless.
- React/ReactDOM/htm are vendored in `vendor/` and exposed as UMD globals;
  `js/core.js` binds `html = htm.bind(React.createElement)`.
- Templates use htm syntax (`html\`<${Comp} .../>\``, `<//>` to close), not JSX.

## Run / deploy
- Run locally: `./serve.sh` (→ http://localhost:5173). ES modules need HTTP, so
  don't open index.html via file://. If 5173 seems to load nothing/garbage, a
  stale service worker from an unrelated Vite project may be squatting on that
  origin in the browser — just serve on a different port instead
  (`./serve.sh 5199`) rather than trying to debug the stale SW.
- **Testing from the phone**: `localhost` on the phone means the phone itself.
  Find the Mac's LAN IP (`ipconfig getifaddr en0`) and browse to
  `http://<that-ip>:<port>` from the phone instead — both devices need to be on
  the same Wi-Fi.
- Deploy: just `git add -A && git commit && git push`. GitHub Pages serves it.
- Syntax-check JS without Node:
  `/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc -e "checkModuleSyntax(readFile('js/tabs/foo.js'))"`

## Structure
- `index.html` — shell; loads vendored libs then `js/main.js`.
- `js/core.js` — React/htm bindings, localStorage hooks (`useStore`), store
  change pub/sub used by sync, helpers.
- `js/components.js` — Icon, Modal, declarative Form builder, Badge, controls.
- `js/collection.js` — generic CRUD tab (search/sort/filter + modal form); most
  tabs are thin configs over this.
- `js/github.js` — GitHub API client (repo fetch); token storage.
- `js/sync.js` — cross-device sync engine + Sync UI.
- `js/main.js` — app shell: sidebar/bottom nav, theme, routing. `TABS` (canonical
  order, used by the sidebar) = Home, Projects, Career, Business, Growth.
  `BOTTOM_ORDER` reorders those same tabs for the mobile bottom nav so Home sits
  center: Projects, Career, Home, Business, Growth. The active tab's component
  always receives `accent`, `onNavigate` (switches tabs) and `theme`/`setTheme` —
  most tabs ignore the ones they don't use.
- `js/tabs/home.js` — **Home**, the ambient-glass landing screen (only tab with
  the full glass/blob treatment — everything else stays plain white/black per
  theme, just borrowing its accent colors and soft card/button touches). Time-aware
  greeting, live one-line counts pulled from the other stores, and quick-select
  buttons into Projects/Career/Business. `main.js` hides the normal sticky
  content-head for this tab (`isHome`) so it can render full-bleed; on mobile it
  gets its own compact theme/sync footer since the sidebar is hidden there.
- `js/tabs/*.js` — one file per tab, plus `home.js`, `growth.js` (career.js and
  growth.js each render sub-tabs; business.js has its own Overview + Ventures).
- `js/tabs/projects.js` — **Projects** (store key `projects`). Two views via the
  toolbar `Segmented`: **Pipeline** (3 fixed-width columns, Idea/Building/Live,
  cards stacked *downward* within each column — each column scrolls
  independently on desktop, capped to the viewport, so a big stage doesn't push
  Live off the bottom of the page) and **All Apps** (flat alphabetical list of
  every project regardless of stage — the "find this one by name" view).
  Board/list cards are deliberately light — name + one-line description + an
  **Open in Claude Code** launch button if `folder` is set — click anywhere else
  on a card/row to open the full **detail view** (`ProjectDetail`, same
  component from either entry point). Detail is a full `content-body` takeover
  (not a modal) with a `← Back to Projects` button; opening/closing it uses the
  native View Transitions API (`document.startViewTransition` +
  `ReactDOM.flushSync`, see `runTransition` in `projects.js`) so the clicked
  card visibly morphs into the hero title — falls back to an instant swap if
  unsupported or the user has reduced-motion on. Detail content order: stage +
  version pills → name → description → **live URL** (prominent, right after the
  description) grouped with Open-in-Claude-Code/repo/chat as one actions row →
  next step / just did (inline-editable, same click-to-edit pattern the card
  used to have) → **stats** (`StatTile`/`Sparkline` from `components.js`: days
  old, days in current stage, journal count, last touched, weekly activity
  sparkline — all derived from `_created`/`_stagedAt`/`log`, nothing new to keep
  in sync) → notes → journal log. Self-contained (no longer uses
  `github.js`/repo auto-fetch).
- `js/tabs/business.js` — **Business** tab (store key `business-ventures`), for
  side-venture ideas separate from the Projects pipeline — money-focused (monthly
  revenue/cost, customers) rather than build-focused. **Overview** sub-tab rolls up
  totals across every venture; **Ventures** sub-tab is a pipeline board (same
  Idea/Building/Live stages + journal-log detail view as Projects, just without
  the Claude Code launch integration).
- `js/tabs/growth.js` — combines **Timeline, Skills, Glossary, Resources** as
  sub-tabs (career.js's sub-tab pattern) — the four "learning journey" tabs read
  better together than as separate nav destinations. Each sub-tab still just
  renders the original `TimelineTab`/`SkillsTab`/`GlossaryTab`/`ResourcesTab`
  components unchanged, so their store keys (`timeline`, `skills`, `glossary`,
  `resources`) and seed data didn't move.
- `launcher/` — `ClaudeCodeOpener.app` source + `install.sh`. Registers a
  `claudecode://` URL scheme so the launch button opens Terminal in a project's
  folder running `claude`. Built with osacompile/PlistBuddy (no Node). The built
  app lives in `~/Applications` (not committed); re-run `launcher/install.sh` to
  rebuild. Mac-only; button is a no-op on phone/other devices.
- `sw.js` — service worker (network-first; bump CACHE version on changes).

## Design system
- **Display font**: Sora (self-hosted, `fonts/Sora-{500,600,700}.woff`,
  `@font-face` in `css/styles.css`, `--font-display` var). Used for headlines/
  titles/stat numbers only (`h1`, `.ppl-title`, `.pd-hero-name`, `.stat-num`,
  `.brand-text strong`) — body text stays on the system font stack.
- **Ambient layer**: a fixed, very-low-opacity two-blob gradient wash
  (`.ambient`, rendered once in `main.js`'s app shell) carries Home's
  atmosphere through every tab, not just the landing screen. `--amb-op` is the
  opacity knob (light/dark themes set it separately).
- **Brand mark**: inline SVG node-cluster mark (three dots in the accent trio,
  thin connecting lines) in `.brand`, replacing the old flat "NP" square.
- **Mission-control stat primitives**: `StatTile`/`Sparkline` in
  `components.js` — big Sora numbers + sparkline bars, pure CSS/SVG-free (divs
  sized by inline `height%`), no charting dependency. Currently only consumed
  by the Projects detail view; reuse them if Home/Business ever want the same
  treatment.

## Data + sync
- Data lives in **localStorage** (keys prefixed `nah:`) as the live cache.
- **Cross-device sync is built and working**: when enabled, each dataset is
  stored as `data/<key>.json` in this repo via the GitHub Contents API. Pulls on
  focus/60s, pushes on change (debounced), last-write-wins by per-file
  timestamp. See `js/sync.js`. The user enables it via the cloud button with a
  fine-grained token (Contents: read/write).

## Adding & updating a project from a Claude Code session
The Projects tab's **"New with Claude"** button opens Claude Code in this repo to
*talk through* an idea (a conversation, not an interview — Neil often won't have
full scope yet). Help him think it through; as soon as the basics are clear,
**create the project early** with whatever's known and keep refining it as you
talk. The hub is just data — edit `data/projects.json`, no code changes.

Project shape (omit/blank what's unknown):
`id` (unique string), `_created` (ISO), `name`, `description` (one-line),
`stage` (Idea | Building | Live), `_stagedAt` (ISO the
project entered its current stage — set this to now whenever you change `stage`,
so the hub orders projects within a stage chronologically), `version` (free
text, e.g. "v1.2" or "MVP" — shown as a small tag on the detail view, optional),
`folder` (e.g. `~/Claude/foo`), `chatUrl`, `repoUrl`, `liveUrl`, `nextStep`
("what's next"), `lastDid` ("what we just did"), `notes`, `log` (journal: array
of `{ id, ts (ISO), text }`, newest-first — a running history of
sessions/progress shown in the project's detail view, and the source of the
"last touched" stat and activity sparkline there).

To write a change:
1. Read `data/projects.json` (shape `{ "updatedAt": <ISO>, "data": [ … ] }`).
2. Add a new project, or find the existing one (match `id`, or `folder`/`name`)
   and update its fields — especially **`nextStep`**, **`lastDid`**, and `stage`
   to reflect where things stand.
3. Set top-level `updatedAt` to current ISO (must be newer, or last-write-wins
   sync won't adopt it).
4. `git add data/projects.json && git commit && git push`. The hub pulls on
   focus/60s and the card updates.

**Keeping projects current:** at a natural stopping point in any session that's
working on a hub-tracked project (its `folder` matches the cwd, even if that's a
different repo — use `git -C ~/Claude/neil-ai-hub …` to commit/push the hub),
update that project's `lastDid` (what we just did) and `nextStep` (what's next),
and bump `stage` if it changed. Also **prepend a `log` entry**
(`{ id, ts, text }`, newest-first) summarizing the session so the detail view
builds up a real history over time. That's what makes the hub a live
mission-control.

## Open items / TODO
1. **Sync must be enabled on each device** (token pasted per device) for true
   two-way *writes*. Since 2026-07-16, **reads no longer need a token at all,
   and no longer need an empty store either**: `bootstrapFromDeployedData()`
   in `js/sync.js` re-checks the deployed `data/<key>.json` files against
   `sync-meta` on every load, focus, and 60s tick, and adopts them whenever
   their `updatedAt` is newer — a device just gets to see whatever's
   committed, sync token or not. (Previously it only reseeded a store the
   *first* time it was completely empty, which is why a newly-committed
   project like Reel silently never showed up on Neil's phone until this
   fix.) The token is still only needed to *push* local edits from that
   device.
2. **Repo is still PUBLIC.** User wants it private (career notes live in it).
   Caveat: private repos disable GitHub Pages on the free plan. Option on the
   table: split into a **public app repo + separate private data repo** (small
   change in `js/sync.js` to point at the private repo for data).
3. PNG app icons are generated by a pure-Python script (no PIL); SVG is primary.
4. **Redesign v1 shipped 2026-07-09** (Home/Business/Growth tabs, new accent
   trio + light-glass touches). Approved and deployed.
5. **Redesign v2 shipped 2026-07-09** (same day, second session) — Neil said v1
   still felt "low-budget, like Notion." This pass added the identity layer
   (Sora font, brand mark, ambient wash — see Design system section) and
   rebuilt Projects: simplified cards, a new alphabetical **All Apps** view,
   and the modal detail view replaced with a full drill-in screen using the
   View Transitions API for a "card expands into itself" animation. Iterated
   twice on layout before landing: first tried a single-page stacked-sections
   layout (rejected — Neil didn't want to scroll past all of Building to reach
   Live), landed back on 3 fixed-width kanban columns but fixed so cards stack
   *downward* per column with independent capped scroll (the original bug:
   `.stage-cards` was `flex-direction: row`, so a stage like Building with 11
   cards rendered ~3400px wide in one row — that's why "will I scroll right"
   was a real concern, not hypothetical). Only Projects got the IA rework this
   pass — Home/Career/Business/Growth still use the v1 layout, just inherit the
   new font/ambient/brand automatically since those are global. Next session
   should ask before touching those other tabs' structure.
6. Confirm on Neil's next visit that the Sora font and ambient wash render
   correctly on iPhone Safari (tested locally on Mac before shipping; phone
   verification over LAN didn't happen this session).
7. **Home redesign ("Mission control") + dock/sync fixes shipped 2026-07-16.**
   Neil reported Reel missing from Neil's Apps, apps not sorted alphabetically,
   the bottom dock floating again, wanted app links to leave the app cleanly,
   and asked for a more engaging Home. Fixed: the sync self-heal gap (see TODO
   #1), strict alphabetical sort in `useLiveApps()`, the full PWA-shell
   restructure (see Conventions), standalone-aware external links
   (`externalLinkProps()`/`IS_STANDALONE` in `core.js`, applied in
   home/projects/business tabs), and rebuilt Home with a 2x2 stat-card grid +
   an all-projects activity sparkline above the Apps grid — approved direction
   was "Mission control" (stats-forward), always-pinned shell (not mobile-only).
   Verified locally via headless Chrome at phone width (390-500px) and desktop
   (1400px): dock flush at bottom, Reel appears, apps alphabetical, stat cards
   and sparkline render with real data. **Not yet verified on Neil's actual
   installed iPhone PWA** — per the dock-bug doc's own caveats, iOS standalone
   viewport behavior can't be fully confirmed from a Mac. Next session (or
   Neil directly): open the installed Hub icon (not Safari), confirm the dock
   sits flush with no dead strip below it, pull-to-refresh doesn't rubber-band
   the whole app, and tapping an app in Neil's Apps hands off to Safari instead
   of an in-app sheet. Also merged/deleted a duplicate "Rendezvous" project
   entry in `data/projects.json` (an old empty Building-stage stub) into the
   real deployed one, folding its later log entries in rather than losing them.
8. **Dock-float bug — three rounds on 2026-07-17, see Conventions for the
   full account.** Round 1 (2026-07-16) restructured the CSS shell but also
   added a JS-measured `--app-height` var, assumed safe — it wasn't. Round 2
   removed that var, reverting `.app` to plain `height: 100%` against the
   `position:fixed;inset:0` pin — still floated. A color-coded debug build
   plus the sync-panel diagnostics (showing `innerHeight`/`visualViewport`
   both reading 894px against a Pro Max's true 932px) revealed *even*
   `position:fixed;inset:0` depends on the same broken internal WebKit
   viewport number on Neil's device. Round 3 (build v59): dropped the
   exact-height approach entirely — normal document scroll +
   `position: sticky` for `.bottom-nav`/`.content-head`/`.sidebar`, which
   don't need to know the true height in advance. **Not yet confirmed
   on-device** — next session or Neil directly: force-quit/reopen twice,
   confirm build v59 in the sync panel, confirm the dock sits flush with no
   dead strip below it, and sanity-check that normal page scroll (not an
   inner-container scroll) feels right and doesn't rubber-band oddly. If
   it's *still* wrong, get the diagnostics screenshot and exact device
   model first — do not attempt a 4th blind CSS change.

## Deploy checklist — the app must stay LIVE and CURRENT (do this every change)
Neil uses the deployed PWA on his phone as his daily driver. Any session that
touches this repo must leave the live site working and up to date:

1. **Syntax-check every changed JS file** before committing (no Node here):
   `/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc -e "checkModuleSyntax(readFile('js/foo.js'))"`
   — it throws a SyntaxError on bad input, silence means OK. One broken module
   blanks the whole app on his phone.
2. **Bump `sw.js` CACHE version *and* `window.__BUILD__` in `index.html`'s
   inline script together** whenever any app asset (JS/CSS/HTML/icons)
   changes — without the CACHE bump, phones keep serving the old build; the
   build stamp (visible in the sync panel, `js/sync.js`) is how a screenshot
   from Neil can prove which build actually produced what's on screen, so
   "the fix didn't work" and "you're looking at a stale cached build" stop
   being indistinguishable. Also note `sw.js`'s fetch handler uses
   `{ cache: 'no-store' }` — without it, "network-first" can still silently
   serve an unexpired *HTTP*-cached response underneath the SW logic.
3. **Data edits**: top-level `updatedAt` in each edited `data/*.json` must be
   set strictly newer (current ISO), or last-write-wins sync silently ignores
   the change on devices.
4. **Commit and push before ending the session** — an unpushed commit is
   invisible to the phone. Deploy IS the push (GitHub Pages).
5. **Verify it went live** (Pages takes ~a minute):
   `curl -s https://zvcodez.github.io/neil-ai-hub/sw.js | head -4` and check
   the CACHE version matches what you just pushed.
6. **Never break the self-heal path**: `bootstrapFromDeployedData()` in
   `js/sync.js` keeps every store current from the site's own `data/*.json`
   (added 2026-07-15 after iOS storage eviction kept blanking Neil's phone —
   the token lives in the same storage, so sync couldn't recover on its own;
   extended 2026-07-16 from a one-time empty-store rescue into an always-on
   freshness check, since a non-empty but stale store had the same silent-gap
   problem). It requires the `data/` files to stay deployed with the site. If
   data ever moves (e.g. private data repo split), repoint the bootstrap in
   the same change.

## Conventions
- **PWA shell — do not reintroduce the "raised dock" bug.** This is the 5th
  Neil project to hit it (after ZV's Edge, Jot, Reel); took until 2026-07-17
  (three rounds) to actually find the root cause here. Background writeup:
  `~/Claude/dock-issue/PWA-DOCK-BUG.md` — **that doc's core recommendation
  ("pin html/body with `position:fixed;inset:0`, clip to exactly one scroll
  container, optionally reinforce with a JS-measured `--app-height` var") is
  WRONG for this app and was the actual bug for two of the three rounds.**
  Treat that doc as background reading on the *symptom*, not as the fix to
  copy — the fix that actually worked here is architecturally different.
  - **Root cause, confirmed on Neil's real device (iPhone Pro/Pro Max,
    Standard zoom):** `window.innerHeight` and `visualViewport.height` both
    read 894px, but that device's true logical height is 932px — WebKit
    under-reports the viewport by ~38pt in standalone mode. This is not
    fixable by reading a *different* API: `100vh`/`100dvh`, `visualViewport`,
    `innerHeight`, and — this is the part that cost two extra rounds —
    even `position: fixed; inset: 0` on `html`/`body` (assumed to be "the
    one primitive WebKit always gets right") all ultimately trace back to
    the same wrong internal viewport number on this device. Any CSS or JS
    mechanism that tries to compute/consume an *exact* full-screen height
    is vulnerable here, no matter which API supplies the number.
  - **The actual fix: don't try to know the exact height.** `html`/`body`
    use normal document flow (no `position: fixed` pin, no `overflow:
    hidden` clip) — the whole page scrolls normally, like an ordinary
    website. `.app`/`.home` use `min-height: 100dvh` as a best-effort "at
    least one screen" floor (can still under-shoot by the same ~38pt if a
    tab's content is shorter than one screen — a much smaller, rarer
    residual case than the dock being fully detached). `.bottom-nav` is
    `position: sticky; bottom: 0`, not `fixed` and not a plain flex sibling
    of a clipped shell — sticky rides the browser's live compositor-tracked
    scroll position, which stays correct even when the *reported* viewport
    metric is lying, because it doesn't need to know the total height in
    advance. `.content-head`/`.sidebar` are `position: sticky; top: 0`
    (desktop sidebar also keeps `height: 100vh` — desktop browsers don't
    have this standalone-mode bug, only iOS home-screen PWAs do).
  - `.stage-cards` and `.modal-backdrop` keep their own independent inner
    scrollers (`overflow-y: auto`) — unaffected by the above, still fine.
  - `index.html`'s inline script measures `--safe-top`/`--safe-bottom` via a
    physical DOM probe (not raw CSS `env()`) — confirmed correct on-device
    (62px/34px) and still legitimate; WebKit bugs 191872/274773 (`env()` not
    set until "some arbitrary time after page load," can go stale) are
    real, just weren't this particular bug. Recalc still runs on
    `visibilitychange`/`pageshow` as a low-cost mitigation for a separate,
    unresolved iOS 17+ `position: fixed` drift-after-backgrounding bug
    (Apple Developer Forums thread 744327) — untested whether that one ever
    manifests here.
  - `window.__DIAG__` + the sync panel's diagnostics readout (`js/sync.js`)
    are what actually cracked this, specifically by revealing the ~38pt gap
    against the known device spec. Before changing the shell again on
    faith, get real numbers from Neil's device (and his exact iPhone model)
    first — two of the three rounds here were spent on plausible-sounding
    fixes that had no on-device evidence behind them.
  - Before touching any of `html`/`body`/`#root`/`.app`/`.content`/
    `.content-body`/`.bottom-nav`/`.home` sizing or positioning, re-read this
    section — every regression here looked like an innocuous one-line CSS
    change, including the ones this section itself has already corrected
    twice.
- Match the existing buildless, vendored-module style. No new dependencies.
- **When Neil signs off** ("okay that's all for now", "okay bye", or anything that
  means he's leaving to continue later), update the **Open items / TODO** section
  above with exactly where we left off and the next step, so the next fresh session
  picks up cleanly without re-explaining.
