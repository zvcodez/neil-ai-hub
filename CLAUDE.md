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
- `js/tabs/projects.js` — **Projects pipeline** (kanban over store key `projects`).
  Manual cards at any stage (Idea→Discussing→Planning→Building→Live), each with a
  Claude chat link, GitHub repo/live links, and an **Open in Claude Code** launch
  button. Self-contained (no longer uses `github.js`/repo auto-fetch).
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
so the hub orders projects within a stage chronologically), `folder` (e.g.
`~/Claude/foo`), `chatUrl`, `repoUrl`, `liveUrl`, `nextStep` ("what's next"),
`lastDid` ("what we just did"), `notes`, `log` (journal: array of
`{ id, ts (ISO), text }`, newest-first — a running history of sessions/progress
shown in the card's "Open details" view).

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
   two-way sync. It's confirmed working (repo has `data/*.json`).
2. **Repo is still PUBLIC.** User wants it private (career notes live in it).
   Caveat: private repos disable GitHub Pages on the free plan. Option on the
   table: split into a **public app repo + separate private data repo** (small
   change in `js/sync.js` to point at the private repo for data).
3. PNG app icons are generated by a pure-Python script (no PIL); SVG is primary.
4. **Redesign v1 shipped 2026-07-09** (see Structure section for what changed:
   Home/Business/Growth tabs, new accent trio + light-glass touches). Neil
   reviewed it locally (Mac + phone over LAN) and approved; it's deployed live.
   He said explicitly there's **more redesign/IA discussion still to come** but
   hadn't gotten into specifics yet when this session ended — next session
   should ask him what's next rather than assuming, don't just keep iterating
   on the same four tabs unprompted.

## Conventions
- Match the existing buildless, vendored-module style. No new dependencies.
- Bump the `sw.js` CACHE version whenever assets change so updates ship.
- **When Neil signs off** ("okay that's all for now", "okay bye", or anything that
  means he's leaving to continue later), update the **Open items / TODO** section
  above with exactly where we left off and the next step, so the next fresh session
  picks up cleanly without re-explaining.
